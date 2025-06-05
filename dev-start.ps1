# NexPrep Development Setup Script for Windows
# Run this script to start the development environment

Write-Host "🚀 Starting NexPrep Development Environment..." -ForegroundColor Green

# Check if we're in the right directory
if (!(Test-Path ".\admin-panel") -or !(Test-Path ".\backend")) {
    Write-Host "❌ Error: Please run this script from the NexPrep root directory" -ForegroundColor Red
    exit 1
}

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    }
    catch {
        return $false
    }
}

# Check if ports are available
if (Test-Port 4200) {
    Write-Host "⚠️  Warning: Port 4200 is already in use. Please stop the existing Angular dev server." -ForegroundColor Yellow
}

if (Test-Port 5000) {
    Write-Host "⚠️  Warning: Port 5000 is already in use. Please stop the existing backend server." -ForegroundColor Yellow
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
npm run install:all

Write-Host "🔧 Starting development servers..." -ForegroundColor Cyan
Write-Host "Frontend will be available at: http://localhost:4200" -ForegroundColor Green
Write-Host "Backend API will be available at: http://localhost:5000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow

# Start both development servers
npm run dev
