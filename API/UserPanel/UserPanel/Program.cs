using Infrastructure;
using UserPanel.Application;
using log4net.Config;
using Microsoft.OpenApi.Models;

using UserPanel.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Core.Abstractions;
using Infrastructure.Repositories;
//using Core.Shared.Tenant_DB;
 

var builder = WebApplication.CreateBuilder(args);

//WebSocketConfig wsc = new WebSocketConfig();
ConfigurationManager configuration = builder.Configuration;
// Add services to the container.

var connection = configuration.GetConnectionString("DBConnection");

// For Entity Framework
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseMySQL(configuration.GetConnectionString("DBConnection")));

// For Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// Adding Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})

// Adding Jwt Bearer
.AddJwtBearer(options =>
{
    options.SaveToken = true;
    options.RequireHttpsMetadata = false;
    options.TokenValidationParameters = new TokenValidationParameters()
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = false,
        ClockSkew = TimeSpan.Zero,

        ValidAudience = configuration["JWT:ValidAudience"],
        ValidIssuer = configuration["JWT:ValidIssuer"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["JWT:Secret"]))
    };
});
builder.Services.AddSwaggerGen(options => {
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme."
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme {
                    Reference = new Microsoft.OpenApi.Models.OpenApiReference {
                        Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                            Id = "Bearer"
                    }
                },
                new string[] {}
        }
    });
});

//Injecting services.
//builder.Services.RegisterServices();
//builder.Services.RegisterInfrastructure();

//builder.Services.AddScoped<ITenantProvider, TenantProvider>();

builder.Services.AddControllers();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);


// My changes
builder.Services.AddScoped<ISalesCommissionRepository, SalesCommissionRepository>();



// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();



var devCorsPolicy = "UserPanelCorsPolicy";
builder.Services.AddCors(options =>
{
    options.AddPolicy(devCorsPolicy, builder => {
        builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();



// Configure the HTTP request pipeline.
//if (app.Environment.IsDevelopment())  //  Commenting for Swagger Run, After Publish
//{ 
//app.UseMiddleware<TenantResolutionMiddleware>();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors(devCorsPolicy);
//app.UseWebSockets();
////}

//app.Use(async (context, next) =>
//{
//    if (context.Request.Path == "/ws")
//    {
//        if (context.WebSockets.IsWebSocketRequest)
//        {
//            var webSocket = await context.WebSockets.AcceptWebSocketAsync();
//            await wsc.HandleWebSocketConnection(webSocket);
//        }
//        else
//        {
//            context.Response.StatusCode = 400; // Bad Request
//        }
//    }
//    else
//    {
//        await next();
//    }
//});

app.UseHttpsRedirection();
app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();
