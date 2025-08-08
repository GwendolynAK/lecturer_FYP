// src/components/CourseAttendanceChart.jsx
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../theme/ThemeContext';

export default function CourseAttendanceChart({ attendanceData = { present: 75, absent: 25 } }) {
  const { theme } = useTheme();

  const option = {
    tooltip: {
      show: false
    },
    series: [
      {
        name: 'Attendance',
        type: 'pie',
        radius: ['60%', '85%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 3,
          borderColor: theme === 'dark' ? '#4b5563' : '#fff', // gray-600 in dark mode
          borderWidth: 2,
        },
        label: {
          show: true,
          position: 'center',
          formatter: `${attendanceData.present}%`,
          fontSize: 18,
          fontWeight: 'bold',
          color: theme === 'dark' ? '#f3f4f6' : '#333',
          fontFamily: 'Mulish, sans-serif',
        },
        labelLine: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
            fontFamily: 'Mulish, sans-serif',
            color: theme === 'dark' ? '#f3f4f6' : '#333',
          }
        },
        data: [
          { 
            value: attendanceData.present, 
            name: 'Present',
            itemStyle: { color: '#10b981' } // Green
          },
          { 
            value: attendanceData.absent, 
            name: 'Absent',
            itemStyle: { color: '#ef4444' } // Red
          },
        ],
      },
    ],
  };

  return (
    <div className="w-full h-full">
      <ReactECharts 
        option={option} 
        style={{ height: '120px', width: '100%' }} 
      />
      <div className="flex justify-center gap-4 mt-8 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">Positive</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">Negative</span>
        </div>
      </div>
    </div>
  );
}
