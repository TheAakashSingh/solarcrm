import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TaskNotificationModal } from '@/components/notifications/TaskNotificationModal';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button - positioned relative to header */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden bg-white shadow-md h-8 w-8"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="md:ml-64 min-h-screen">
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
