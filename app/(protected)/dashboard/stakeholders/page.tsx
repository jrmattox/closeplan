import { Suspense } from 'react'
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { mockStakeholders } from '@/lib/test-data'

export default function StakeholdersPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stakeholders</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage deal stakeholders and their roles
          </p>
        </div>
      </div>

      <Card>
        <div className="p-6">
          <Suspense fallback={<div>Loading stakeholders...</div>}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockStakeholders.map((stakeholder) => (
                  <TableRow key={stakeholder.id}>
                    <TableCell className="font-medium">
                      {stakeholder.name}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        {stakeholder.role}
                      </span>
                    </TableCell>
                    <TableCell>{stakeholder.organization}</TableCell>
                    <TableCell>{stakeholder.department}</TableCell>
                    <TableCell>
                      <a href={`mailto:${stakeholder.email}`} className="text-blue-600 hover:underline">
                        {stakeholder.email}
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Suspense>
        </div>
      </Card>
    </div>
  )
} 