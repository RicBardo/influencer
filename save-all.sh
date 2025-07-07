#!/bin/bash
cd /private/tmp/influencer-game
git add .
git commit -m "Auto-save on $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main 