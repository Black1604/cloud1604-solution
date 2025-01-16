# Deployment script for Business Solution System
# Must be run as Administrator

# Configuration
$AppName = "business-solution"
$AppDir = "C:\Apps\$AppName"
$BackupDir = "C:\Backups\$AppName"
$LogFile = "C:\Logs\$AppName\deploy.log"

# Ensure directories exist
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $LogFile) | Out-Null

# Logging function
function Write-Log {
    param($Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] $Message"
    Write-Host $LogMessage
    Add-Content -Path $LogFile -Value $LogMessage
}

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Log "Please run as Administrator"
    exit 1
}

# Validate environment
Write-Log "Validating environment..."
if (-not (Test-Path ".env.production")) {
    Write-Log "Error: .env.production file not found"
    exit 1
}

# Backup database
Write-Log "Creating database backup..."
$BackupFile = Join-Path $BackupDir "db_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
try {
    pg_dump -U app_user business_solution > $BackupFile
    Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip" -Force
    Remove-Item $BackupFile
    Write-Log "Database backup created at $BackupFile.zip"
} catch {
    Write-Log "Error creating database backup: $_"
    exit 1
}

# Pull latest changes
Write-Log "Pulling latest changes..."
try {
    git pull origin main
} catch {
    Write-Log "Error pulling latest changes: $_"
    exit 1
}

# Install dependencies
Write-Log "Installing dependencies..."
try {
    npm install --production
} catch {
    Write-Log "Error installing dependencies: $_"
    exit 1
}

# Generate Prisma client
Write-Log "Generating Prisma client..."
try {
    npx prisma generate
} catch {
    Write-Log "Error generating Prisma client: $_"
    exit 1
}

# Run database migrations
Write-Log "Running database migrations..."
try {
    npx prisma migrate deploy
} catch {
    Write-Log "Error running migrations: $_"
    exit 1
}

# Build application
Write-Log "Building application..."
try {
    npm run build
} catch {
    Write-Log "Error building application: $_"
    exit 1
}

# Update PM2 configuration
Write-Log "Updating PM2 configuration..."
try {
    $pm2List = pm2 list
    if ($pm2List -match $AppName) {
        pm2 reload $AppName
    } else {
        pm2 start npm --name $AppName -- start
    }
    pm2 save
} catch {
    Write-Log "Error updating PM2 configuration: $_"
    exit 1
}

# Test application health
Write-Log "Testing application health..."
$MaxRetries = 5
$RetryCount = 0
$HealthCheckUrl = "http://localhost:3000/api/health"

while ($RetryCount -lt $MaxRetries) {
    try {
        $response = Invoke-WebRequest -Uri $HealthCheckUrl -UseBasicParsing
        $content = $response.Content | ConvertFrom-Json
        if ($content.status -eq "ok") {
            Write-Log "Application is healthy"
            break
        }
    } catch {
        $RetryCount++
        if ($RetryCount -eq $MaxRetries) {
            Write-Log "Error: Application health check failed after $MaxRetries attempts"
            exit 1
        }
        Write-Log "Health check failed, retrying in 5 seconds..."
        Start-Sleep -Seconds 5
    }
}

# Cleanup old backups
Write-Log "Cleaning up old backups..."
Get-ChildItem -Path $BackupDir -Filter "db_backup_*.zip" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | 
    ForEach-Object { Remove-Item $_.FullName }

# Final status
Write-Log "Deployment completed successfully"

# Print summary
Write-Host "`nDeployment Summary:"
Write-Host "------------------"
Write-Host "- Application: $AppName"
Write-Host "- Directory: $AppDir"
Write-Host "- Database Backup: $BackupFile.zip"
Write-Host "- Log File: $LogFile"
Write-Host "- Status: Success" 