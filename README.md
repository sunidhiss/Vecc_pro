# ⚔️ Pixel Quest

A retro pixel-art themed web application for college students to play daily games and compete on departmental leaderboards. Features a bright, pastel "90s Indie Game" sky aesthetic with animated characters, coins, and floating frosted glass cards.

## 🌟 Features
- **Retro Aesthetic**: Pastel colors, `Press Start 2P` fonts, CSS animated skies and sprites.
- **USN Authentication**: Users log in using their University Seat Number (e.g., `NNM24CS001`) which automatically parses their Year and Department.
- **Daily Games**: Play Wordle, Aptitude Blitz, and Tech Quizzes.
- **Leaderboards**: Compete individually (`Top Students`) and collaboratively as a department (`Top Departments`) with animated retro health bars and podiums.
- **Admin Panel**: Dedicated admin terminal to configure daily Wordle words and quiz questions.
- **Local Persistence**: Entirely frontend-driven using browser `localStorage` to save points, completions, and user data.

## 🚀 Getting Started Locally

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation & Running

1. **Clone or Download** this repository to your local machine.
2. **Navigate** into the project directory:
   ```bash
   cd pixel-quest
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
5. **Open in Browser**: The terminal will display a local URL (usually `http://localhost:5173/`). Ctrl+Click or copy-paste it into your browser.

## 🛠️ Tech Stack
- **Framework**: React.js
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **Styling**: Vanilla CSS with CSS Modules/Variables and custom keyframe animations.
- **Database**: Local Storage (No backend required)

## 🔑 Demo Login Details

### Student Login
- Enter any valid USN format on the Sign In page.
- Format: `[CollegeCode][Year][DeptCode][RollNo]` 
- Example: `NNM24CS001` (Logs in as a Computer Science student).
- Valid Department Codes: `CS`, `IS`, `AD`, `EC`, `ME`, `CV`.

### Admin Login
To access the hidden Admin Panel to set daily questions:
- **USN**: `admin`
- **Password**: `hey1234`
- Once logged in, an "ACCESS ADMIN PANEL" button will appear on the Games Page.

## 📦 Building for Production

If you want to build the static files for production deployment:

```bash
npm run build
```
This will create a `dist` folder containing the compiled assets ready to be served by any static host (like Vercel, Netlify, or GitHub Pages).
