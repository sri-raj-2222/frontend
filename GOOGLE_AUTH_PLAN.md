# Real Google OAuth Integration Plan

Setting up genuine Google authentication ensures that your application behaves exactly like an industry-standard product. To achieve this, you need to seamlessly wire your front-end button to the official React bindings for Google Identity Services.

## Technical Execution (Developer Steps)

### 1. Install Dependencies
You will need to install the official authentication package: 
`npm install @react-oauth/google`

### 2. Configure the Global Provider
You must modify `src/main.tsx` to wrap your entire application inside a `<GoogleOAuthProvider>`. This gives every component in your app the ability to securely spawn the Google Popup logic. 
- *Code*: `<GoogleOAuthProvider clientId="YOUR_CLIENT_ID"> <App /> </GoogleOAuthProvider>`

### 3. Wire the "Continue with Google" Button
You will implement the `useGoogleLogin` hook inside your `src/components/ui/auth-dialog.tsx`. 
- When a user clicks your specific button, this hook physically forces your browser to spawn the standard Google popup window.
- The hook manages the `onSuccess` callback (where you get securely verified login credentials) and the `onError` callback.

## Administrative Responsibilities (Google Cloud Steps)

Because Google requires you to prove you own the website before they let you use their popup natively, you will need to complete these 3 backend setup tasks:

1. Log into your Google Account and go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Project, head to **APIs & Services > Credentials**, and select **Create Credentials -> OAuth Client ID**. (Set the application type to Web Application).
3. It will give you a long ID string ending in `.apps.googleusercontent.com`. You will take that string, open `src/main.tsx`, and paste it over the `"YOUR_CLIENT_ID"` placeholder you mapped out in Step 2!

> **Warning**: Attempting to mock this system with a fake ID will successfully force the popup to open, but it will immediately throw an **Error 400: invalid_client** message. This is normal and means your React code works; Google simply rejected the fake key.
