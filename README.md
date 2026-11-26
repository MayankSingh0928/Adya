# Adya RO Water

Water jar and capsule delivery operations app: Expo Router + TypeScript mobile client and Express + MongoDB API.

## Run locally

Keep connection strings, passwords, and signing secrets in ignored local environment files or service settings. Never commit `.env` files. Copy `server/.env.example` to `server/.env` and fill in your own values before running the API locally. Create `mobile/.env` with your API URL for local development.

1. Install Node.js 20+.
2. From this folder, run `npm install` if dependencies are not installed, then start the API with `npm run api`.
3. Find the computer's LAN IPv4 address with `ipconfig` on Windows. Create `mobile/.env` with `EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:4000/api` (replace the example with the computer's IPv4 address).
4. Run `npm run mobile`. Install Expo Go on the Android phone, connect phone and computer to the same Wi-Fi, then scan the QR code.

If the team accounts ever need to be created in this database, set a unique `INITIAL_PASSWORD` in `server/.env`, then run `npm run seed` from the project folder. The seed command keeps any existing account unchanged. The account usernames are:

| Person | Role | Username |
|---|---|---|
| Mayank | admin | `mayank` |
| Vikas | operator | `vikas` |
| Naveen | operator | `naveen` |
| Shikha | viewer | `shikha` |
| Rinki | viewer | `rinki` |

For a standalone Android APK, install EAS CLI, sign in to Expo, configure an EAS project in `mobile`, and run `eas build --platform android --profile preview`. Install the generated APK by opening it on the phone (allow installation from that source if Android asks). For Play Store distribution, use an EAS production AAB build.

## Testing on Android

- Sign in with each role and confirm role restrictions: viewer is read-only, operator creates orders and logs attempts, admin can also edit/delete orders, expenses, and staff.
- Create a Regular Alternate Day order and a Walk-In or Local Event order. Log partial deliveries, returns, and payments; verify due, empty balance, and amount due calculations.
- Open Customers to check phone-grouped balances; open Reports to see collections, expenses, and net.
- Use the receipt action and confirm WhatsApp opens with the generated message.

The API must be reachable from the phone over the local network. If using Atlas, allow your development machine's IP in the Atlas network access list. Production deployment needs HTTPS and a strong secret.

## Deploy the API to Vercel (Hobby)

The Express API is in `server/src/index.js` and exports the app for Vercel. Create a Vercel project from this repository and set **Root Directory** to `server`. Use the default Node.js settings. Add these Production environment variables in **Settings → Environment Variables**:

- `MONGODB_URI`: the Atlas connection string for the `Adya` database.
- `JWT_SECRET`: a new, randomly generated secret (at least 32 random bytes).

Deploy the project, then open `https://YOUR-VERCEL-DOMAIN/api/health`; it should return `{"ok":true}`. Vercel Functions use changing outbound IP addresses. Atlas must allow their connections; the simple Atlas allowlist option is `0.0.0.0/0`, which permits connections from any IP and therefore relies on a strong, unique database password. Prefer a narrower supported Vercel-to-Atlas network option if available on your Atlas plan. Do not put either secret in source control or in the mobile app.

After deployment, set `EXPO_PUBLIC_API_URL` in `mobile/eas.json`'s preview build profile to `https://YOUR-VERCEL-DOMAIN/api`, increment `android.versionCode` in `mobile/app.json`, and run `eas build --platform android --profile preview` from `mobile`. Install the resulting APK on the phone. The app will then connect over mobile data as well as Wi-Fi.

## Push to GitHub and connect Vercel

1. On GitHub, create a **private** repository for this app. Leave the options to add a README, `.gitignore`, or license unchecked because those files already exist here.
2. Open PowerShell in this project folder. Check that the local environment files are ignored:

   ```powershell
   git check-ignore -v server/.env mobile/.env
   ```

   Each path should show a matching `.gitignore` rule. Do not continue if either file is not ignored.

3. Review what will be published. The project should not include `.env` files, APK/AAB files, signing keys, or the `.vercel` folder:

   ```powershell
   git status --short
   git add -A
   git status --short
   git diff --cached --check
   ```

   If you see a secret or local-only file in the staged changes, unstage it with `git restore --staged PATH` and fix the ignore rule before continuing.

4. Commit the project and connect it to the private GitHub repository. Replace `YOUR_GITHUB_NAME` in the remote URL:

   ```powershell
   git commit -m "Prepare Adya RO Water app"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_NAME/adya-ro-water.git
   git push -u origin main
   ```

   If `origin` already exists, use `git remote set-url origin https://github.com/YOUR_GITHUB_NAME/adya-ro-water.git` before pushing.

5. In Vercel, choose **Add New → Project**, import the private GitHub repository, set **Root Directory** to `server`, and leave the framework/build settings at their defaults.
6. Before the first deployment, add `MONGODB_URI` and `JWT_SECRET` as Vercel environment variables for Production. Use the Atlas URI with the database name `Adya` and a newly rotated database password. Generate a long random JWT secret. Do not add either value to GitHub or the mobile app.
7. Deploy. Check `https://YOUR-VERCEL-DOMAIN/api/health`; it should return `{"ok":true}`. For Atlas connectivity from Vercel, configure the narrowest network access option supported by your Atlas plan. The broad `0.0.0.0/0` allowlist permits connections from every IP, so use it only if you accept that exposure and have a strong, unique database password.
8. Once the health check works, update the preview `EXPO_PUBLIC_API_URL` in `mobile/eas.json` to `https://YOUR-VERCEL-DOMAIN/api`, increment `android.versionCode` in `mobile/app.json`, then from the `mobile` folder run `eas build --platform android --profile preview`. Install the generated APK on the phone. Later pushes to GitHub can trigger Vercel API redeploys automatically.
