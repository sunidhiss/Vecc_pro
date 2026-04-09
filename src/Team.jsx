import React from "react";
import TeamCard from "./TeamCard";
import shreyaSImage from "./assets/shreya_s.jpg";
import lieselImage from "./assets/liesel.jpg";
import shreyaPJImage from "./assets/shreya_p.jpg";
import sunidhiImage from "./assets/sunidhi.jpg";
import "./Team.css";

function Team() {
  return (
    <div className="team-container">
      <h1 className="team-title">OUR TEAM</h1>
      
      <TeamCard 
        name="Salian"
        role="Go Play Bold!!"
        image={shreyaSImage}
        github="https://github.com/shreya-ssalian"
        linkedin="https://www.linkedin.com/in/shreya-s-salian/"
      />

      <TeamCard 
        name="Sunidhi"
        role="Nah, I'd Win"
        image={sunidhiImage}
        github="https://github.com/sunidhiss"
        linkedin="https://www.linkedin.com/in/sunidhiss"
      />

      <TeamCard 
        name="Liesel"
        role="Life Is Short, Play More Games"
        image={lieselImage}
        github="https://github.com/lieseld07"
        linkedin="https://www.linkedin.com/in/liesel-dsouza-650556386/"
      />

      <TeamCard 
        name="Shreya"
        role="Never Give Up"
        image={shreyaPJImage}
        github="https://github.com/shreyapj7"
        linkedin="https://www.linkedin.com/in/shreya-pj-00a18536a/"
      />

    </div>
  );
}

export default Team;