# Frontend
Steps to setup frontend:
cd to frontend
run "npx create-react-app ."
run "npm install --save-dev electron"
run "npm install --save-dev electron-is-dev"
Within the package.json file, make sure the scripts look like this:
"scripts": {
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject",
  "electron": "electron ."
}

For Running applications:

in terminal navigate to frontend and do "npm start" for web app
open new terminal and navigate to frontend. then do "npm run electron" for desktop app

