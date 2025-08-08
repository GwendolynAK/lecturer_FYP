// src/components/AttendanceDoughnutChart.jsx
import ReactECharts from "echarts-for-react";
import { students } from "../data/students";
import { useTheme } from '../theme/ThemeContext';
import React, { useRef, useEffect } from 'react';

export default function DailyAttendanceDoughnutChart({ onPresentClick, onAbsentClick }) {
  const { theme } = useTheme();
  const chartRef = useRef(null);
  
  // Count present and absent students
  const presentCount = students.filter(
    (student) => student.status === "present"
  ).length;
  const absentCount = students.filter(
    (student) => student.status === "absent"
  ).length;

  const option = {
    tooltip: {
      show: false
    },
    grid: {
      left: '1%',
      right: '5%',
      bottom: '0%',  // Increased bottom margin for labels
      top: '10%',     // Added top margin for value labels
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['Present', 'Absent'],
      axisLabel: {
        color: theme === 'dark' ? '#f3f4f6' : '#374151',
        fontFamily: 'Mulish, sans-serif',
        fontSize: 12,
        margin: 14  // Add margin to push labels down
      },
      axisLine: {
        lineStyle: {
          color: theme === 'dark' ? '#6b7280' : '#d1d5db'
        }
      }
    },
    yAxis: {
      type: 'value',
      min: 0,  // Start from 0
      max: 200,  // Set max to total students
      interval: 40,  // Set interval to create nice divisions
      axisLabel: {
        color: theme === 'dark' ? '#f3f4f6' : '#374151',
        fontFamily: 'Mulish, sans-serif',
        fontSize: 12,
        formatter: '{value}'  // Show whole numbers
      },
      axisLine: {
        lineStyle: {
          color: theme === 'dark' ? '#6b7280' : '#d1d5db'
        }
      },
      splitLine: {
        lineStyle: {
          color: theme === 'dark' ? '#4b5563' : '#e5e7eb'
        }
      }
    },
    series: [
      {
        name: "Students",
        type: "bar",
        data: [
          {
            value: presentCount,
            itemStyle: { color: "#22c55e" },
            name: 'Present'
          },
          {
            value: absentCount,
            itemStyle: { color: "#ef4444" },
            name: 'Absent'
          }
        ],
        barWidth: '20%',
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(0,0,0,0.2)',
            shadowOffsetX: 0,
            shadowOffsetY: 2
          }
        },
        label: {
          show: true,
          position: 'top',
          distance: 1,  // Distance from the bar
          formatter: '{c}',
          fontSize: 12,
          fontWeight: 'bold',
          color: theme === 'dark' ? '#f3f4f6' : '#374151',
          fontFamily: 'Mulish, sans-serif'
        }
      }
    ]
  };

  useEffect(() => {
    if (chartRef.current) {
      const chart = chartRef.current.getEchartsInstance();
      
      const handleBarClick = (params) => {
        if (params.name === 'Present') {
          onPresentClick();
        } else if (params.name === 'Absent') {
          onAbsentClick();
        }
      };

      chart.on('click', handleBarClick);
      
      return () => {
        chart.off('click', handleBarClick);
      };
    }
  }, [onPresentClick, onAbsentClick]);

  return (
    <ReactECharts
      ref={chartRef}
      option={option}
      style={{ height: "150%", width: "90%" }}
    />
  );
}
