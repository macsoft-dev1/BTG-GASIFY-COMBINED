from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import mysql.connector
import os
from datetime import datetime
from dotenv import load_dotenv
from typing import List  # <--- Added for List[int]

load_dotenv()

router = APIRouter(
    prefix="/api/claim",
    tags=["Claim Payment Discussion"]
)

# --- Existing Models ---
class HodDiscussionRequest(BaseModel):
    claim_id: int
    comment: str
    hod_name: str

class ApplicantReplyRequest(BaseModel):
    claim_id: int
    reply: str
    applicant_name: str

class DiscussionRequest(BaseModel):
    claim_id: int
    comment: str
    user_name: str
    sender_role: str = "" 

# --- NEW MODEL FOR SPC ---
class GenerateSPCRequest(BaseModel):
    Ids: List[int]
    OrgId: int
    BranchId: int
    UserId: int
    CreatedDate: str

def get_db_connection_sync():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME_FINANCE', 'btggasify_finance_live'),
        port=int(os.getenv('DB_PORT', 3306))
    )

# --- NEW FUNCTION: Generate SPC ---
@router.post("/generate_spc")
def generate_spc(payload: GenerateSPCRequest):
    conn = None
    cursor = None
    try:
        # We need to connect to the User Panel DB for Claims
        # Using the same credentials but switching DB or referencing explicitly
        user_db_name = os.getenv('DB_NAME_USER_NEW', 'btggasify_userpanel_live')
        
        conn = get_db_connection_sync()
        cursor = conn.cursor()
        
        if not payload.Ids:
            raise HTTPException(status_code=400, detail="No IRNs selected")

        # 1. Generate Claim No (SPC-SEQ)
        # Note: We explicitly reference the user_db_name table
        seq_query = f"SELECT IFNULL(MAX(id), 0) + 1 FROM {user_db_name}.tbl_claim_header"
        cursor.execute(seq_query)
        next_id = cursor.fetchone()[0]
        claim_no = f"SPC-{next_id}"

        # 2. Create Claim Header
        header_query = f"""
            INSERT INTO {user_db_name}.tbl_claim_header 
            (ClaimNo, ClaimDate, OrgId, BranchId, CreatedBy, CreatedDate, Status, IsActive)
            VALUES (%s, NOW(), %s, %s, %s, NOW(), 'Draft', 1)
        """
        cursor.execute(header_query, (claim_no, payload.OrgId, payload.BranchId, payload.UserId))
        new_claim_id = cursor.lastrowid

        # 3. Update IRNs (Invoice Receipt Headers)
        # Using 'format_strings' for IN clause in MySQL connector
        format_strings = ','.join(['%s'] * len(payload.Ids))
        update_query = f"""
            UPDATE {user_db_name}.tbl_invoice_receipt_header 
            SET ClaimId = %s, 
                ClaimStatus = 'Claimed'
            WHERE id IN ({format_strings})
        """
        
        # Combine parameters: claim_id first, then the list of IDs
        params = [new_claim_id] + payload.Ids
        cursor.execute(update_query, tuple(params))

        conn.commit()

        return {
            "status": True, 
            "message": f"Payment Claim {claim_no} generated successfully!", 
            "data": new_claim_id
        }

    except Exception as e:
        print(f"Error generating SPC: {str(e)}")
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# --- EXISTING FUNCTIONS BELOW (Unchanged) ---

@router.post("/save_hod_discussion")
def save_hod_discussion(req: HodDiscussionRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection_sync()
        cursor = conn.cursor()
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Fetch existing comment
        cursor.execute("SELECT applicant_hod_comment, hod_discussed_count FROM tbl_claimAndpayment_header WHERE Claim_ID = %s", (req.claim_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Claim not found")
        
        existing_comment = row[0] or ""
        current_count = row[1] or 0
        new_count = current_count + 1
        
        if new_count == 3:
            # 3rd time logic
            forced_message = "Please cancel the transaction"
            comment_entry = f"[{req.hod_name} at {timestamp}]: {forced_message}"
            new_comment = existing_comment + "\n" + comment_entry if existing_comment else comment_entry
            
            # Reset approvals and set Status to 'Saved'
            update_query = """
                UPDATE tbl_claimAndpayment_header 
                SET claim_hod_isdiscussed = 1, 
                    hod_discussed_count = %s, 
                    applicant_hod_comment = %s, 
                    IsSubmitted = 0,
                    claim_hod_isapproved = 0,
                    claim_gm_isapproved = 0,
                    claim_director_isapproved = 0,
                    is_delete_required = 1
                WHERE Claim_ID = %s
            """
            cursor.execute(update_query, (new_count, new_comment, req.claim_id))
        else:
            # Normal logic
            comment_entry = f"[{req.hod_name} at {timestamp}]: {req.comment}"
            new_comment = existing_comment + "\n" + comment_entry if existing_comment else comment_entry
            
            update_query = """
                UPDATE tbl_claimAndpayment_header 
                SET claim_hod_isdiscussed = 1, 
                    hod_discussed_count = %s, 
                    applicant_hod_comment = %s, 
                    IsSubmitted = 0
                WHERE Claim_ID = %s
            """
            cursor.execute(update_query, (new_count, new_comment, req.claim_id))

        conn.commit()
        
        return {"status": True, "message": "Discussion sent to applicant", "data": new_comment, "is_delete_required": new_count == 3}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@router.post("/save_applicant_reply")
def save_applicant_reply(req: ApplicantReplyRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection_sync()
        cursor = conn.cursor()
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        reply_entry = f"[{req.applicant_name} at {timestamp}]: {req.reply}"
        
        # Fetch existing comment and Department
        cursor.execute("SELECT applicant_hod_comment, applicant_gm_comment, DepartmentId FROM tbl_claimAndpayment_header WHERE Claim_ID = %s", (req.claim_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Claim not found")
            
        existing_hod_comment = row[0] or ""
        existing_gm_comment = row[1] or ""
        department_id = row[2] or 0
        
        final_comment = ""
        msg = ""

        if department_id != 9:
            # Dept != 9: Discussion between Claimant <-> GM
            new_comment = existing_gm_comment + "\n" + reply_entry if existing_gm_comment else reply_entry
            
            # Sent back to GM (Applicant replies)
            # update applicant_gm_comment, IsSubmitted=1 (sent), claim_gm_isdiscussed=0 (pending GM view)
            update_query = """
                UPDATE tbl_claimAndpayment_header 
                SET applicant_gm_comment = %s, 
                    IsSubmitted = 1,
                    claim_gm_isdiscussed = 0
                WHERE Claim_ID = %s
            """
            cursor.execute(update_query, (new_comment, req.claim_id))
            final_comment = new_comment
            msg = "Reply sent to GM"
        else:
            # Dept = 9: Existing logic (Claimant <-> HOD)
            new_comment = existing_hod_comment + "\n" + reply_entry if existing_hod_comment else reply_entry
            
            update_query = """
                UPDATE tbl_claimAndpayment_header 
                SET applicant_hod_comment = %s, 
                    IsSubmitted = 1,
                    claim_hod_isdiscussed = 0
                WHERE Claim_ID = %s
            """
            cursor.execute(update_query, (new_comment, req.claim_id))
            final_comment = new_comment
            msg = "Reply sent to HOD"
        
        conn.commit()
        
        return {"status": True, "message": msg, "data": final_comment}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@router.get("/get_history/{claim_id}")
def get_history(claim_id: int):
    conn = None
    cursor = None
    try:
        conn = get_db_connection_sync()
        cursor = conn.cursor()
        
        cursor.execute("SELECT applicant_hod_comment, applicant_gm_comment, DepartmentId FROM tbl_claimAndpayment_header WHERE Claim_ID = %s", (claim_id,))
        row = cursor.fetchone()
        
        if not row:
            return {"status": False, "message": "Claim not found"}
            
        department_id = row[2] or 0
        if department_id != 9:
             # Dept != 9: Show applicant_gm_comment
             comment_data = row[1] or ""
        else:
             # Dept = 9: Show applicant_hod_comment
             comment_data = row[0] or ""
            
        return {"status": True, "data": comment_data}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@router.post("/save_hod_gm_discussion")
def save_hod_gm_discussion(req: DiscussionRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection_sync()
        cursor = conn.cursor()
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        cursor.execute("SELECT hod_gm_comment, gm_discussed_count, applicant_gm_comment, DepartmentId FROM tbl_claimAndpayment_header WHERE Claim_ID = %s", (req.claim_id,))
        row = cursor.fetchone()
        
        # Close cursor to ensure clean slate
        cursor.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Claim not found")
        
        existing_hod_gm_comment = row[0] or ""
        current_gm_title = row[1] or 0
        existing_applicant_gm_comment = row[2] or ""
        department_id = row[3] or 0
        
        is_third_count = False
        if req.sender_role == "GM" and (current_gm_title + 1) == 3:
             is_third_count = True

        if is_third_count:
             comment_entry = f"[{req.user_name} at {timestamp}]: Please cancel the transaction"
        else:
             comment_entry = f"[{req.user_name} at {timestamp}]: {req.comment}"
        
        new_comment = ""
        
        # Re-open cursor for Update
        cursor = conn.cursor()
        
        update_parts = []
        params = []
        
        if department_id != 9:
             # Dept != 9: GM talks to Applicant (skip HOD)
             # Use applicant_gm_comment
             new_comment = existing_applicant_gm_comment + "\n" + comment_entry if existing_applicant_gm_comment else comment_entry
             update_parts = ["applicant_gm_comment = %s"]
             params.append(new_comment)
             
             if req.sender_role == "GM":
                 update_parts.append("claim_gm_isdiscussed = 1")
                 update_parts.append("gm_discussed_count = %s")
                 params.append(current_gm_title + 1)
                 
                 # Send to Applicant
                 update_parts.append("IsSubmitted = 0")
                 
                 if is_third_count:
                    update_parts.append("is_delete_required = 1")
                    # Do not reset HOD approval as HOD is skipped/auto-approved
                    update_parts.append("claim_director_isapproved = 0")
        else:
             # Dept = 9: HOD <-> GM
             new_comment = existing_hod_gm_comment + "\n" + comment_entry if existing_hod_gm_comment else comment_entry
             update_parts = ["hod_gm_comment = %s"]
             params.append(new_comment)
             
             if req.sender_role == "GM":
                if is_third_count:
                    # 3rd time logic
                    update_parts.append("claim_gm_isdiscussed = 1")
                    update_parts.append("gm_discussed_count = %s")
                    params.append(current_gm_title + 1)
                    
                    # Reset everything
                    update_parts.append("claim_hod_isapproved = 0")
                    update_parts.append("claim_gm_isapproved = 0")
                    update_parts.append("claim_director_isapproved = 0")
                    update_parts.append("IsSubmitted = 0")
                    update_parts.append("is_delete_required = 1")
                    
                else:
                    update_parts.append("claim_gm_isdiscussed = 1")
                    update_parts.append("gm_discussed_count = %s")
                    params.append(current_gm_title + 1)
                    update_parts.append("claim_hod_isapproved = 0") # Send back to HOD

             elif req.sender_role == "HOD":
                update_parts.append("claim_gm_isdiscussed = 0")
                update_parts.append("claim_hod_isapproved = 1")

        update_query = f"UPDATE tbl_claimAndpayment_header SET {', '.join(update_parts)} WHERE Claim_ID = %s"
        params.append(req.claim_id)
        
        cursor.execute(update_query, tuple(params))
        conn.commit()
        
        return {"status": True, "message": "Discussion saved", "data": new_comment, "is_delete_required": is_third_count}
    except Exception as e:
        print(f"Error in save_hod_gm_discussion: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
    finally:
        try:
            if cursor: cursor.close()
            if conn: conn.close()
        except:
            pass

@router.get("/get_hod_gm_history/{claim_id}")
def get_hod_gm_history(claim_id: int):
    conn = None
    cursor = None
    try:
        conn = get_db_connection_sync()
        cursor = conn.cursor()
        
        cursor.execute("SELECT hod_gm_comment, applicant_gm_comment, DepartmentId FROM tbl_claimAndpayment_header WHERE Claim_ID = %s", (claim_id,))
        row = cursor.fetchone()
        cursor.fetchall() # clear any remaining
        
        if not row:
            return {"status": False, "message": "Claim not found"}
        
        department_id = row[2] or 0
        if department_id != 9:
             # Dept != 9: Show applicant_gm_comment for GM
             comment_data = row[1] or ""
        else:
             # Dept = 9: Show hod_gm_comment
             comment_data = row[0] or ""
        
        return {"status": True, "data": comment_data}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# --- GM <-> Director Discussion ---

@router.post("/save_gm_director_discussion")
def save_gm_director_discussion(req: DiscussionRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection_sync()
        cursor = conn.cursor()
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        cursor.execute("SELECT gm_director_comment, director_discussed_count FROM tbl_claimAndpayment_header WHERE Claim_ID = %s", (req.claim_id,))
        row = cursor.fetchone()
        
        cursor.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Claim not found")
        
        existing_comment = row[0] or ""
        current_dir_count = row[1] or 0
        
        is_third_count = False
        if req.sender_role == "Director" and (current_dir_count + 1) == 3:
             is_third_count = True
        
        if is_third_count:
             comment_entry = f"[{req.user_name} at {timestamp}]: Please cancel the transaction"
        else:
             comment_entry = f"[{req.user_name} at {timestamp}]: {req.comment}"

        new_comment = existing_comment + "\n" + comment_entry if existing_comment else comment_entry
        
        cursor = conn.cursor()
        
        update_parts = ["gm_director_comment = %s"]
        params = [new_comment]
        
        if req.sender_role == "Director":
            if is_third_count:
                 # 3rd time logic - reset all approvals
                update_parts.append("claim_director_isdiscussed = 1")
                update_parts.append("director_discussed_count = %s")
                params.append(current_dir_count + 1)
                update_parts.append("claim_gm_isapproved = 0")
                update_parts.append("claim_hod_isapproved = 0")
                update_parts.append("claim_director_isapproved = 0")
                update_parts.append("IsSubmitted = 0")
                update_parts.append("is_delete_required = 1")
            else:
                update_parts.append("claim_director_isdiscussed = 1")
                update_parts.append("director_discussed_count = %s")
                params.append(current_dir_count + 1)
                update_parts.append("claim_gm_isapproved = 0")
                
        elif req.sender_role == "GM":
            update_parts.append("claim_director_isdiscussed = 0")
            update_parts.append("claim_gm_isapproved = 1")
            
        update_query = f"UPDATE tbl_claimAndpayment_header SET {', '.join(update_parts)} WHERE Claim_ID = %s"
        params.append(req.claim_id)
        
        cursor.execute(update_query, tuple(params))
        conn.commit()
        
        return {"status": True, "message": "Discussion saved", "data": new_comment, "is_delete_required": is_third_count}
    except Exception as e:
        print(f"Error in save_gm_director_discussion: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
    finally:
        try:
            if cursor: cursor.close()
            if conn: conn.close()
        except:
            pass

@router.get("/get_gm_director_history/{claim_id}")
def get_gm_director_history(claim_id: int):
    conn = None
    cursor = None
    try:
        conn = get_db_connection_sync()
        cursor = conn.cursor()
        
        cursor.execute("SELECT gm_director_comment FROM tbl_claimAndpayment_header WHERE Claim_ID = %s", (claim_id,))
        row = cursor.fetchone()
        cursor.fetchall() # clear
        
        if not row:
            return {"status": False, "message": "Claim not found"}
        
        return {"status": True, "data": row[0] or ""}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()