#!/bin/bash
cd /private/tmp/influencer-game
git pull origin main
cp -f src/PlayerColumn.jsx influencer-game-react/src/PlayerColumn.jsx
cp -f src/interests.js influencer-game-react/src/interests.js
cd influencer-game-react
npm install
npm run dev
