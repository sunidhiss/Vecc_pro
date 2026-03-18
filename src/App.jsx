import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignInPage from './pages/SignInPage';
import GamesPage from './pages/GamesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/games/*" element={<GamesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
