import React from 'react';
import { Link } from 'react-router-dom';
import './styles.css';

const Homepage: React.FC = () => {
  return (
    <div className="homepage">
      <section className="hero">
        <div className="hero-content">
          <h1>LamboRadar</h1>
          <h2>Meme Token Tracking & Analytics</h2>
          <p>Your ultimate platform for tracking and analyzing meme tokens on the Solana blockchain</p>
          <div className="hero-buttons">
            <Link to="/login" className="hero-button primary">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2>Key Features</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-time Analytics</h3>
              <p>Monitor token performance with live market data and real-time updates</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Advanced Filtering</h3>
              <p>Easily find tokens that match your specific criteria and investment strategy</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Performance Tracking</h3>
              <p>Track liquidity, market cap, volume, and transaction metrics for all tokens</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔔</div>
              <h3>Custom Alerts</h3>
              <p>Set up notifications for important market movements and new trending tokens</p>
            </div>
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="container">
          <div className="info-content">
            <div className="info-text">
              <h2>Why Choose LamboRadar?</h2>
              <p>
                In the fast-paced world of meme tokens, having the right data at the right time can make all the 
                difference. LamboRadar provides comprehensive analytics and insights that help you stay ahead of the market.
              </p>
              <ul className="info-list">
                <li>Track thousands of meme tokens in real-time</li>
                <li>Advanced filtering to identify high-potential tokens</li>
                <li>Detailed token metrics and historical data</li>
                <li>Secure and reliable platform built by industry experts</li>
              </ul>
              <Link to="/login" className="info-button">
                Get Started Today
              </Link>
            </div>
            <div className="info-image">
              <div className="dashboard-preview"></div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>Ready to elevate your trading strategy?</h2>
          <p>Join thousands of traders who trust LamboRadar for their meme token analytics</p>
          <Link to="/login" className="cta-button">
            Sign In Now
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Homepage;