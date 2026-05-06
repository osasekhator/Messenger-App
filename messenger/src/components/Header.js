import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

function Header() {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/dm">DMs</Link>
        <Link to="/groups">Groups</Link>
      </nav>
    </div>
  );
}

export default Header;