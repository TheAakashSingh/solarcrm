import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TaskNotificationModal } from '@/components/notifications/TaskNotificationModal';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { 
    newTask, 
    showTaskModal, 
    showLoginTaskModal, 
    todayTasks, 
    closeTaskModal, 
    closeLoginTaskModal 
  } = useTaskNotifications();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        {children}
      </main>
      
      {/* Real-time Task Assignment Modal */}
      <TaskNotificationModal
        task={newTask}
        isOpen={showTaskModal}
        onClose={closeTaskModal}
        isLoginPrompt={false}
      />

      {/* Login Task Summary Modal */}
      {showLoginTaskModal && todayTasks.length > 0 && (
        <TaskNotificationModal
          task={todayTasks[0]} // Show first task
          isOpen={showLoginTaskModal}
          onClose={closeLoginTaskModal}
          isLoginPrompt={true}
        />
      )}
    </div>
  );
}
