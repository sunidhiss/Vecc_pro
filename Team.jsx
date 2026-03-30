import React from "react";
import TeamCard from "./TeamCard";

function Team() {
  return (
    <div className="team-container">
      
      <TeamCard 
        name="Shreya S Salian"
        role="Frontend"
        image="/images/member1.jpeg"
        github="https://github.com/shreya-ssalian"
        linkedin="https://www.linkedin.com/in/shreya-s-salian/"
      />

      <TeamCard 
        name="Sunidhi"
        role="Backend"
        image="/images/member2.jpg"
        github="https://github.com/bob"
        linkedin="https://linkedin.com/in/bob"
      />

      <TeamCard 
        name="Liesel"
        role="Designer"
        image="/images/member3.jpg"
        github="https://github.com/clara"
        linkedin="https://linkedin.com/in/clara"
      />

      <TeamCard 
        name="Shreya PJ"
        role="AI Engineer"
        image="/images/member4.jpg"
        github="https://github.com/david"
        linkedin="https://linkedin.com/in/david"
      />

    </div>
  );
}

export default Team;