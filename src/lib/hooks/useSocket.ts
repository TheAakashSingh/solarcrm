import { useEffect, useCallback } from 'react';
import { getSocket, joinEnquiryRoom, leaveEnquiryRoom } from '../socket';
import { useAuth } from '@/contexts/AuthContext';

export const useSocket = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      return;
    }

    return () => {
      // Cleanup handled by disconnectSocket in logout
    };
  }, [isAuthenticated]);

  const joinRoom = useCallback((enquiryId: string) => {
    joinEnquiryRoom(enquiryId);
  }, []);

  const leaveRoom = useCallback((enquiryId: string) => {
    leaveEnquiryRoom(enquiryId);
  }, []);

  return {
    socket: getSocket(),
    joinRoom,
    leaveRoom,
    isConnected: getSocket()?.connected || false,
  };
};

export const useEnquirySocket = (enquiryId: string | null) => {
  const { joinRoom, leaveRoom } = useSocket();

  useEffect(() => {
    if (!enquiryId) return;

    joinRoom(enquiryId);

    return () => {
      leaveRoom(enquiryId);
    };
  }, [enquiryId, joinRoom, leaveRoom]);
};
