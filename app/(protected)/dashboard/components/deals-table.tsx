import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Deal } from "@/lib/test-data"
import { formatDistanceToNow } from "date-fns"

interface DealsTableProps {
  deals: Deal[]
}

export function DealsTable({ deals }: DealsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Deal Name</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <TableRow key={deal.id}>
              <TableCell className="font-medium">{deal.name}</TableCell>
              <TableCell>{deal.customer}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium
                  ${deal.stage === 'CLOSED' 
                    ? 'bg-green-50 text-green-700'
                    : deal.stage === 'NEGOTIATION'
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-blue-50 text-blue-700'
                  }`}>
                  {deal.stage}
                </span>
              </TableCell>
              <TableCell className="text-right">
                ${deal.value.toLocaleString()}
              </TableCell>
              <TableCell>
                {formatDistanceToNow(deal.lastActivity, { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 