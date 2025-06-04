#!/bin/bash

# Script to push the ERP codebase to GitHub
# Repository: https://github.com/Syedirtiza768/enxi-2.git

echo "🚀 Pushing Enxi ERP to GitHub..."
echo ""

# Check git status
echo "📊 Current Git Status:"
git status --short | head -10
echo ""

# Show commit info
echo "📦 Ready to push commit:"
git log --oneline -1
echo ""

# Set remote URL to HTTPS
echo "🔧 Setting remote URL..."
git remote set-url origin https://github.com/Syedirtiza768/enxi-2.git

# Show remote info
echo "🌐 Remote repository:"
git remote -v
echo ""

# Instructions for authentication
echo "🔑 Authentication Required:"
echo "When prompted, enter your GitHub credentials:"
echo "  Username: Your GitHub username (Syedirtiza768)"
echo "  Password: Your GitHub Personal Access Token (NOT your GitHub password)"
echo ""
echo "📝 To create a Personal Access Token:"
echo "  1. Go to: https://github.com/settings/tokens"
echo "  2. Click 'Generate new token (classic)'"
echo "  3. Select 'repo' scope"
echo "  4. Copy the generated token and use it as password"
echo ""

# Attempt the push
echo "🚀 Attempting to push..."
echo "Press Enter to continue or Ctrl+C to abort"
read -r

# Push to GitHub
git push -u origin main

# Check if push was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Your ERP codebase has been pushed to GitHub!"
    echo "🌐 Repository URL: https://github.com/Syedirtiza768/enxi-2"
    echo ""
    echo "📊 Repository Statistics:"
    echo "  Files: 578"
    echo "  Lines of Code: 167,637"
    echo "  Features: Complete ERP with RBAC, P2P workflow, and more"
    echo ""
    echo "🎉 Your repository is now live on GitHub!"
else
    echo ""
    echo "❌ Push failed. Please check your credentials and try again."
    echo ""
    echo "💡 Troubleshooting:"
    echo "  1. Ensure you're using a Personal Access Token, not your password"
    echo "  2. Check that the repository exists: https://github.com/Syedirtiza768/enxi-2"
    echo "  3. Verify your GitHub username is correct"
    echo ""
    echo "🔄 To retry: ./push-to-github.sh"
fi