import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignInPage from './pages/SignInPage';
import LoadingPage from './pages/LoadingPage';
import GamesPage from './pages/GamesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import Team from './Team';
import Navbar from './components/Navbar';
import TargetCursor from './components/TargetCursor';

function App() {
  useEffect(() => {
    if (localStorage.getItem("theme") === "dark") {
      document.body.classList.add("dark");
    }
  }, []);

  return (
    <Router>
      <TargetCursor />
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<LoadingPage />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/loading" element={<LoadingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/games/*" element={<GamesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/team" element={<Team />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
