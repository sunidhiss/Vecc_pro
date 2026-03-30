import React from "react";
import TeamCard from "./TeamCard";
import "./Team.css";

function Team() {
  return (
    <div className="team-container">
      <h1 className="team-title">OUR TEAM</h1>
      
      <TeamCard 
        name="Shreya S Salian"
        role="Frontend"
        image="https://avatars.dicebear.com/api/pixel-art/shreya-ssalian.svg"
        github="https://github.com/shreya-ssalian"
        linkedin="https://www.linkedin.com/in/shreya-s-salian/"
      />

      <TeamCard 
        name="Sunidhi"
        role="Backend"
        image="https://avatars.dicebear.com/api/pixel-art/sunidhi.svg"
        github="https://github.com/bob"
        linkedin="https://linkedin.com/in/bob"
      />

      <TeamCard 
        name="Liesel"
        role="Designer"
        image="https://avatars.dicebear.com/api/pixel-art/liesel.svg"
        github="https://github.com/clara"
        linkedin="https://linkedin.com/in/clara"
      />

      <TeamCard 
        name="Shreya PJ"
        role="AI Engineer"
        image="https://avatars.dicebear.com/api/pixel-art/shreya-pj.svg"
        github="https://github.com/david"
        linkedin="https://linkedin.com/in/david"
      />

    </div>
  );
}

export default Team;