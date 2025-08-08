// src/components/AttendanceDoughnutChart.jsx
import ReactECharts from 'echarts-for-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useSliceName } from "../context/SliceNameContext";
import { useTheme } from '../theme/ThemeContext';

export default function AttendanceDoughnutChart() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSliceName } = useSliceName();
  const { theme } = useTheme();

  const handleSliceClick = (params) => {
    const monthMap = {
      January: 'JAN',
      February: 'FEB',
      March: 'MAR',
      April: 'APR',
      May: 'MAY',
    };

    const sliceName = monthMap[params.name];
    if (sliceName) {
      /* alert(sliceName); */
      navigate('/report', { state: { fromChart: true, sliceName } });
    }
  };

  const onEvents = {
    'click': handleSliceClick,
  };

  const option = {
  /*   title: {
      text: 'Attendance',
      left: 'center',
      top: 'top',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Mulish, sans-serif',
      },
    }, */
 /*    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
      textStyle: {
        fontFamily: 'Mulish, sans-serif',
        color: theme === 'dark' ? '#f3f4f6' : '#374151',
      },
      backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
      borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db',
    }, */
    legend: {
      orient: 'vertical',
      left: 'left',
      data: ['January', 'February', 'March', 'April', 'May'],
      textStyle: {
        fontFamily: 'Mulish, sans-serif',
        color: theme === 'dark' ? '#f3f4f6' : '#374151',
      },
    },
    series: [
      {
        name: 'Attendance',
        type: 'pie',
        radius: ['35%', '95%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius:10,
          borderColor: theme === 'dark' ? '#374151' : '#fff',
          borderWidth: 1,
        },
        label: {
          show: false,
          position: 'center',
          formatter: '{b}',
          fontSize: 16,
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
          { value: 88, name: 'January' },
          { value: 92, name: 'February' },
          { value: 75, name: 'March' },
          { value: 85, name: 'April' },
          { value: 90, name: 'May' },
        ],
      },
    ],
  };

    return <ReactECharts option={option} onEvents={onEvents} style={{ height: '100%', width: '100%' } }/>;
}