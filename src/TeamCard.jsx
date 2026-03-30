import React from "react";

function TeamCard({ name, role, image, github, linkedin }) {
  return (
    <div className="team-card">
      <img src={image} alt={name} className="team-photo" />
      <h3>{name}</h3>
      <p>{role}</p>

      <div className="social-links">
        <a href={github} target="_blank" rel="noopener noreferrer" title="GitHub">
          <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" alt="GitHub" className="social-icon github-icon" />
        </a>
        <a href={linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn">
          <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-plain.svg" alt="LinkedIn" className="social-icon linkedin-icon" />
        </a>
      </div>
    </div>
  );
}

export default TeamCard;