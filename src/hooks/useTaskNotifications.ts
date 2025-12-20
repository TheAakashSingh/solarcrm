import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { onNotification, onAssignmentChanged } from '@/lib/socket';
import { tasksAPI } from '@/lib/api';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';

interface Task {
  id: string;
  enquiryId?: string;
  enquiryNum?: string;
  status: string;
  enquiry?: any;
  client?: any;
  assignedBy?: string;
  assignedDate?: string;
  expectedDispatchDate?: string;
  enquiryAmount?: number;
  enquiry_amount?: number;
  materialType?: string;
  material_type?: string;
  enquiryDetail?: string;
  enquiry_detail?: string;
}

interface UseTaskNotificationsReturn {
  newTask: Task | null;
  showTaskModal: boolean;
  showLoginTaskModal: boolean;
  todayTasks: Task[];
  closeTaskModal: () => void;
  closeLoginTaskModal: () => void;
}

export function useTaskNotifications(): UseTaskNotificationsReturn {
  const { currentUser, isAuthenticated } = useAuth();
  const [newTask, setNewTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLoginTaskModal, setShowLoginTaskModal] = useState(false);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [hasShownLoginTasks, setHasShownLoginTasks] = useState(false);

  // Fetch today's tasks on login
  const fetchTodayTasks = useCallback(async () => {
    if (!currentUser?.id || hasShownLoginTasks) return;

    try {
      const response = await tasksAPI.getMyTasks();
      if (response.success && response.data) {
        const allTasks: Task[] = [];
        const data = response.data;
        
        // Get tasks array (backend returns { tasks, tasksByStatus, ... })
        const tasksArray = data.tasks || [];
        
        // Process each enquiry (tasks are actually enquiries)
        tasksArray.forEach((enquiry: any) => {
          if (!enquiry) return;

          const assignedDate = enquiry.workAssignedDate || enquiry.work_assigned_date;
          const expectedDate = enquiry.expectedDispatchDate || enquiry.expected_dispatch_date;
          
          // Include tasks assigned today OR tasks with today's expected dispatch date
          const isAssignedToday = assignedDate && isToday(new Date(assignedDate));
          const isDueToday = expectedDate && isToday(new Date(expectedDate));
          
          if (isAssignedToday || isDueToday) {
            allTasks.push({
              id: enquiry.id,
              enquiryId: enquiry.id,
              enquiryNum: enquiry.enquiryNum || enquiry.enquiry_num,
              status: enquiry.status,
              enquiry: enquiry,
              client: enquiry.client,
              assignedBy: enquiry.assignedUser?.name,
              assignedDate: assignedDate,
              expectedDispatchDate: expectedDate,
              enquiryAmount: enquiry.enquiryAmount || enquiry.enquiry_amount,
              enquiry_amount: enquiry.enquiry_amount || enquiry.enquiryAmount,
              materialType: enquiry.materialType || enquiry.material_type,
              material_type: enquiry.material_type || enquiry.materialType,
              enquiryDetail: enquiry.enquiryDetail || enquiry.enquiry_detail,
              enquiry_detail: enquiry.enquiry_detail || enquiry.enquiryDetail,
            });
          }
        });

        setTodayTasks(allTasks);
        
        // Show login task modal if there are tasks for today
        if (allTasks.length > 0 && isAuthenticated && !hasShownLoginTasks) {
          setShowLoginTaskModal(true);
          setHasShownLoginTasks(true);
          // Store in localStorage to prevent showing again today
          localStorage.setItem('lastLoginTaskCheck', new Date().toDateString());
        }
      }
    } catch (error) {
      console.error('Error fetching today tasks:', error);
    }
  }, [currentUser?.id, isAuthenticated, hasShownLoginTasks]);

  // Check if we should show login tasks (once per day)
  useEffect(() => {
    if (!currentUser?.id || !isAuthenticated) return;

    const lastCheck = localStorage.getItem('lastLoginTaskCheck');
    const today = new Date().toDateString();
    
    // Only fetch if we haven't checked today
    if (lastCheck !== today) {
      setHasShownLoginTasks(false);
      fetchTodayTasks();
    }
  }, [currentUser?.id, isAuthenticated, fetchTodayTasks]);

  // Listen for real-time task assignments
  useEffect(() => {
    if (!currentUser?.id || !isAuthenticated) return;

    // Listen for assignment notifications
    const cleanupNotification = onNotification((notification: any) => {
      if (notification.type === 'assignment' && notification.assignedToId === currentUser.id) {
        // Fetch task details
        tasksAPI.getMyTasks()
          .then((response) => {
            if (response.success && response.data) {
              // Find the newly assigned task from tasks array
              const tasksArray = response.data.tasks || [];
              const foundEnquiry = tasksArray.find((enquiry: any) => 
                enquiry.id === notification.enquiryId
              );

              if (foundEnquiry) {
                const task: Task = {
                  id: foundEnquiry.id,
                  enquiryId: foundEnquiry.id,
                  enquiryNum: foundEnquiry.enquiryNum || foundEnquiry.enquiry_num,
                  status: foundEnquiry.status,
                  enquiry: foundEnquiry,
                  client: foundEnquiry.client,
                  assignedBy: notification.assignedBy,
                  assignedDate: foundEnquiry.workAssignedDate || foundEnquiry.work_assigned_date,
                  expectedDispatchDate: foundEnquiry.expectedDispatchDate || foundEnquiry.expected_dispatch_date,
                  enquiryAmount: foundEnquiry.enquiryAmount || foundEnquiry.enquiry_amount,
                  enquiry_amount: foundEnquiry.enquiry_amount || foundEnquiry.enquiryAmount,
                  materialType: foundEnquiry.materialType || foundEnquiry.material_type,
                  material_type: foundEnquiry.material_type || foundEnquiry.materialType,
                  enquiryDetail: foundEnquiry.enquiryDetail || foundEnquiry.enquiry_detail,
                  enquiry_detail: foundEnquiry.enquiry_detail || foundEnquiry.enquiryDetail,
                };
                
                setNewTask(task);
                setShowTaskModal(true);
              }
            }
          })
          .catch((error) => {
            console.error('Error fetching task details:', error);
          });
      }
    });

    // Listen for assignment changes
    const cleanupAssignment = onAssignmentChanged((data: any) => {
      if (data.assignedTo?.id === currentUser.id || data.assignedToId === currentUser.id) {
        // Task assigned via assignment_changed event
        if (data.enquiry) {
          const enquiry = data.enquiry;
          const newTask: Task = {
            id: enquiry.id,
            enquiryId: enquiry.id,
            enquiryNum: enquiry.enquiryNum || enquiry.enquiry_num,
            status: enquiry.status,
            enquiry: enquiry,
            client: enquiry.client,
            assignedBy: data.assignedBy?.name,
            assignedDate: enquiry.workAssignedDate || enquiry.work_assigned_date,
            expectedDispatchDate: enquiry.expectedDispatchDate || enquiry.expected_dispatch_date,
            enquiryAmount: enquiry.enquiryAmount || enquiry.enquiry_amount,
            enquiry_amount: enquiry.enquiry_amount || enquiry.enquiryAmount,
            materialType: enquiry.materialType || enquiry.material_type,
            material_type: enquiry.material_type || enquiry.materialType,
            enquiryDetail: enquiry.enquiryDetail || enquiry.enquiry_detail,
            enquiry_detail: enquiry.enquiry_detail || enquiry.enquiryDetail,
          };
          setNewTask(newTask);
          setShowTaskModal(true);
        }
      }
    });

    return () => {
      cleanupNotification();
      cleanupAssignment();
    };
  }, [currentUser?.id, isAuthenticated]);

  const closeTaskModal = useCallback(() => {
    setShowTaskModal(false);
    setNewTask(null);
  }, []);

  const closeLoginTaskModal = useCallback(() => {
    setShowLoginTaskModal(false);
  }, []);

  return {
    newTask,
    showTaskModal,
    showLoginTaskModal,
    todayTasks,
    closeTaskModal,
    closeLoginTaskModal,
  };
}

