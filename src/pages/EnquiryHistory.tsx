import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/common/StatusBadge';
import { enquiriesAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, User, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function EnquiryHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enquiry, setEnquiry] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const [enquiryRes, historyRes] = await Promise.all([
          enquiriesAPI.getById(id),
          enquiriesAPI.getHistory(id)
        ]);

        if (enquiryRes.success) setEnquiry(enquiryRes.data);
        if (historyRes.success) setHistory(historyRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load enquiry history');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (!enquiry) {
    return (
      <MainLayout>
        <Header title="Enquiry Not Found" showNewEnquiry={false} />
        <div className="p-6 text-center">
          <p className="text-muted-foreground">The enquiry you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/enquiries')} className="mt-4">
            Back to Enquiries
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title={`History: ${enquiry.enquiryNum || enquiry.enquiry_num}`}
        subtitle={`${history.length} status changes recorded`}
        showNewEnquiry={false}
      />

      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Enquiry
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Status History Timeline</CardTitle>
            <CardDescription>
              Complete history of status changes for this enquiry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-6">
                {history.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="relative pl-12 animate-fade-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-accent-foreground" />
                    </div>

                    <Card className="card-hover">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <StatusBadge status={item.status} />
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(item.statusChangedDateTime || item.status_changed_date_time), 'dd MMM yyyy, HH:mm:ss')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Assigned to <span className="font-medium">
                              {item.assignedPersonUser?.name || item.assigned_person_name || 'Unknown'}
                            </span>
                          </span>
                        </div>

                        {item.note && (
                          <div className="flex items-start gap-2 mt-3 pt-3 border-t">
                            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <p className="text-sm text-muted-foreground">{item.note}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}

                {history.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No history records found</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
