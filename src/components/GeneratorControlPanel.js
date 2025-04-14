import React from 'react';
import PostGenerationChart from './PostGenerationCharts';

const GeneratorControlPanel = ({ 
  isGenerating, 
  stats, 
  onStartGenerator, 
  onStopGenerator,
  isConnected
}) => {
  return (
    <div className="generator-panel">
      <h3>Post Generator Controls</h3>
      
      <div className="connection-status">
        Status: {isConnected ? (
          <span className="status-connected">Connected</span>
        ) : (
          <span className="status-disconnected">Disconnected</span>
        )}
      </div>
      
      <div className="generator-buttons">
        <button 
          className="generator-start-btn" 
          onClick={onStartGenerator}
          disabled={isGenerating || !isConnected}
        >
          <i className="fas fa-play"></i> Start Generator
        </button>
        
        <button 
          className="generator-stop-btn" 
          onClick={onStopGenerator}
          disabled={!isGenerating || !isConnected}
        >
          <i className="fas fa-stop"></i> Stop Generator
        </button>
      </div>
      
      {stats && (
        <div className="generator-stats">
          <PostGenerationChart stats={stats} />
          
          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-label">URL Links:</span>
              <span className="stat-value">{stats.link}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Photo Uploads:</span>
              <span className="stat-value">{stats.photo}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Video Uploads:</span>
              <span className="stat-value">{stats.video}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Generated:</span>
              <span className="stat-value">{stats.link + stats.photo + stats.video}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratorControlPanel;