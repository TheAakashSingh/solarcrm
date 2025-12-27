import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, Send, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { enquiriesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface EnquiryNote {
  id: string;
  note: string;
  createdBy: string;
  createdAt: string;
  creator?: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
}

interface EnquiryNotesProps {
  enquiryId: string;
  onNoteAdded?: () => void;
}

export function EnquiryNotes({ enquiryId, onNoteAdded }: EnquiryNotesProps) {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<EnquiryNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [enquiryId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await enquiriesAPI.getNotes(enquiryId);
      if (response.success && response.data) {
        setNotes(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    setSubmitting(true);
    try {
      const response = await enquiriesAPI.addNote(enquiryId, newNote.trim());
      if (response.success) {
        setNewNote('');
        await fetchNotes();
        if (onNoteAdded) {
          onNoteAdded();
        }
        toast.success('Note added successfully');
      } else {
        throw new Error(response.message || 'Failed to add note');
      }
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error(error?.message || 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      superadmin: 'bg-purple-500',
      director: 'bg-blue-500',
      salesman: 'bg-green-500',
      designer: 'bg-orange-500',
      production: 'bg-yellow-500',
      purchase: 'bg-pink-500',
    };
    return roleColors[role] || 'bg-gray-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Notes & Comments
        </CardTitle>
        <CardDescription>
          Add notes and comments about this enquiry. All users can see these notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Note Form */}
        <div className="space-y-2">
          <Label htmlFor="new-note">Add a Note</Label>
          <Textarea
            id="new-note"
            placeholder="Type your note or comment here..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button
            onClick={handleAddNote}
            disabled={submitting || !newNote.trim()}
            size="sm"
            className="w-full sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Add Note
              </>
            )}
          </Button>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-4">Recent Notes</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No notes yet. Be the first to add a note!
            </p>
          ) : (
            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {notes.map((note) => {
                const isCurrentUser = note.createdBy === currentUser?.id;
                return (
                  <div
                    key={note.id}
                    className={`flex gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isCurrentUser && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={getRoleBadge(note.creator?.role || '')}>
                          {note.creator?.avatar ? (
                            <img src={note.creator.avatar} alt={note.creator.name} />
                          ) : (
                            getInitials(note.creator?.name || 'U')
                          )}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                      {!isCurrentUser && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground">
                            {note.creator?.name || 'Unknown User'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {note.creator?.role || 'user'}
                          </Badge>
                        </div>
                      )}
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isCurrentUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{note.note}</p>
                      </div>
                      <span className={`text-xs text-muted-foreground mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                        {format(new Date(note.createdAt), 'dd MMM yyyy, HH:mm')}
                      </span>
                    </div>
                    {isCurrentUser && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={getRoleBadge(currentUser?.role || '')}>
                          {currentUser?.avatar ? (
                            <img src={currentUser.avatar} alt={currentUser.name} />
                          ) : (
                            getInitials(currentUser?.name || 'U')
                          )}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

