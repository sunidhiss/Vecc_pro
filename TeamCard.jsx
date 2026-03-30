import React from "react";

function TeamCard({ name, role, image, github, linkedin }) {
  return (
    <div className="team-card">
      <img src={image} alt={name} className="team-photo" />
      <h3>{name}</h3>
      <p>{role}</p>

      <div className="social-links">
        <a href={github} target="_blank" rel="noopener noreferrer">
          🐙
        </a>
        <a href={linkedin} target="_blank" rel="noopener noreferrer">
          💼
        </a>
      </div>
    </div>
  );
}

export default TeamCard;