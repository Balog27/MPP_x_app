import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const PostGenerationChart = ({ stats }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  useEffect(() => {
    if (!stats) return;
    
    // If chart already exists, destroy it before creating a new one
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    
    // Create new chart
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['URL Links', 'Photo Uploads', 'Video Uploads'],
        datasets: [{
          label: 'Post Generation by Type',
          data: [stats.link, stats.photo, stats.video],
          backgroundColor: [
            'rgba(54, 162, 235, 0.7)',  // Blue for links
            'rgba(75, 192, 192, 0.7)',  // Green for photos
            'rgba(255, 99, 132, 0.7)',  // Red for videos
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: '#fff'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          x: {
            ticks: {
              color: '#fff'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#fff'
            }
          },
          title: {
            display: true,
            text: 'Generated Posts by Type',
            color: '#fff',
            font: {
              size: 16
            }
          }
        }
      }
    });
    
    // Clean up function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [stats]);
  
  return (
    <div className="chart-container" style={{ height: '300px', marginBottom: '20px' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default PostGenerationChart;