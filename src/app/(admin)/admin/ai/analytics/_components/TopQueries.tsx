import { Card } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { MessageSquare } from 'lucide-react'
import type { TopQuery } from '../actions'

interface TopQueriesProps {
  queries: TopQuery[]
}

export function TopQueries({ queries }: TopQueriesProps) {
  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-text-secondary" />
        <h2 className="text-lg font-semibold text-text-primary">
          よく聞かれる質問 TOP 10
        </h2>
      </div>

      {queries.length === 0 ? (
        <p className="text-text-secondary text-sm py-4 text-center">
          データがありません
        </p>
      ) : (
        <div className="border border-border-decorative rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>質問</TableHead>
                <TableHead className="w-20 text-right">回数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queries.map((q, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {index + 1}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-text-primary max-w-xs truncate">
                    {q.query}
                  </TableCell>
                  <TableCell className="text-right text-sm text-text-secondary font-medium">
                    {q.count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}
