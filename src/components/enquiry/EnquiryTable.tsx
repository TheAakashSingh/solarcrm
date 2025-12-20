import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Eye, Edit, History, HelpCircle } from 'lucide-react';
import { Enquiry } from '@/types/crm';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface EnquiryTableProps {
  enquiries: Enquiry[];
  showActions?: boolean;
}

export function EnquiryTable({ enquiries, showActions = true }: EnquiryTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <TooltipProvider>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="data-table-header">Enquiry ID</TableHead>
              <TableHead className="data-table-header">
                <div className="flex items-center gap-1">
                  Order #
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Auto-generated when enquiry is created (e.g., ORD-0001, ORD-0002)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead className="data-table-header">Client</TableHead>
            <TableHead className="data-table-header">Created By</TableHead>
            <TableHead className="data-table-header">Material</TableHead>
            <TableHead className="data-table-header">Amount</TableHead>
            <TableHead className="data-table-header">Status</TableHead>
            <TableHead className="data-table-header">Assigned To</TableHead>
            <TableHead className="data-table-header">Expected Dispatch</TableHead>
            {showActions && (
              <TableHead className="data-table-header text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {enquiries.map((enquiry, index) => (
            <TableRow 
              key={enquiry.id}
              className={cn(
                'animate-fade-up hover:bg-gray-50 transition-colors',
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TableCell className="font-mono text-sm font-semibold text-gray-900">
                {(enquiry as any).enquiryNum || enquiry.enquiry_num || '—'}
              </TableCell>
              <TableCell className="font-mono text-sm text-gray-600">
                {(enquiry as any).orderNumber || enquiry.order_number || (
                  <span className="text-gray-400">—</span>
                )}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-gray-900">
                    {(enquiry.client as any)?.clientName || enquiry.client?.client_name || '—'}
                  </p>
                  {(enquiry.client as any)?.contactPerson || enquiry.client?.contact_person ? (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(enquiry.client as any)?.contactPerson || enquiry.client?.contact_person}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {((enquiry as any).enquiryByUser || enquiry.enquiry_by_user)?.avatar ? (
                    <img 
                      src={((enquiry as any).enquiryByUser || enquiry.enquiry_by_user).avatar} 
                      alt={((enquiry as any).enquiryByUser || enquiry.enquiry_by_user)?.name || 'User'} 
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xs font-semibold">
                      {((enquiry as any).enquiryByUser || enquiry.enquiry_by_user)?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {((enquiry as any).enquiryByUser || enquiry.enquiry_by_user)?.name || '—'}
                    </p>
                    {((enquiry as any).enquiryByUser || enquiry.enquiry_by_user)?.role && (
                      <p className="text-xs text-gray-500 capitalize">
                        {((enquiry as any).enquiryByUser || enquiry.enquiry_by_user).role}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200">
                  {(enquiry as any).materialType || enquiry.material_type || '—'}
                </span>
              </TableCell>
              <TableCell className="font-semibold text-gray-900">
                {(enquiry as any).enquiryAmount || enquiry.enquiry_amount 
                  ? formatCurrency((enquiry as any).enquiryAmount || enquiry.enquiry_amount)
                  : '—'}
              </TableCell>
              <TableCell>
                <StatusBadge status={enquiry.status} />
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-gray-900">{(enquiry as any).assignedUser?.name || enquiry.assigned_user?.name || '—'}</p>
                  {(enquiry as any).assignedUser?.role || enquiry.assigned_user?.role ? (
                    <p className="text-xs capitalize text-gray-500 mt-0.5">
                      {(enquiry as any).assignedUser?.role || enquiry.assigned_user?.role}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-gray-600">
                {(enquiry as any).expectedDispatchDate || enquiry.expected_dispatch_date ? (
                  format(new Date((enquiry as any).expectedDispatchDate || enquiry.expected_dispatch_date), 'dd MMM yyyy')
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-gray-100">
                      <Link to={`/enquiries/${enquiry.id}`}>
                        <Eye className="h-4 w-4 text-gray-600" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-gray-100">
                      <Link to={`/enquiries/${enquiry.id}/edit`}>
                        <Edit className="h-4 w-4 text-gray-600" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-gray-100">
                      <Link to={`/enquiries/${enquiry.id}/history`}>
                        <History className="h-4 w-4 text-gray-600" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
          {enquiries.length === 0 && (
            <TableRow>
              <TableCell colSpan={showActions ? 9 : 8} className="h-32 text-center">
                <p className="text-gray-500">No enquiries found</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </TooltipProvider>
  );
}
