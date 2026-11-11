import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoadingPage from './pages/LoadingPage';
import LandingPage from './pages/LandingPage';
import SignInPage from './pages/SignInPage';
import GamesPage from './pages/GamesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import Team from './Team';
import DatabaseSchema from './pages/DatabaseSchema';
import Navbar from './components/Navbar';
import TargetCursor from './components/TargetCursor';

function App() {
  return (
    <Router>
      <TargetCursor />
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<LoadingPage />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/games/*" element={<GamesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/team" element={<Team />} />
          <Route path="/database-schema" element={<DatabaseSchema />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

