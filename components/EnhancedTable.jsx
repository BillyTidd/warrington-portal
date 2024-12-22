// EnhancedTable.js

import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
export function EnhancedTable({ currentEntries, tableHeaders, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {tableHeaders.map((header) => (
              <TableHead key={header.key} colSpan={header.subHeaders ? 2 : 1}>
                {header.label}
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            {tableHeaders.map((header) =>
              header.subHeaders ? (
                header.subHeaders.map((subHeader, index) => (
                  <TableHead key={`${header.key}-${index}`}>{subHeader}</TableHead>
                ))
              ) : (
                <TableHead key={`${header.key}-empty`}></TableHead>
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentEntries.map((entry) => (
            <TableRow key={entry._id}>
              <TableCell>{entry?.date}</TableCell>
              <TableCell>{entry.client}</TableCell>
              <TableCell>{entry.description}</TableCell>
              <TableCell>£{entry.totalAmount?.toFixed(2) ?? 'N/A'}</TableCell>
              <TableCell>{entry.mileage?.miles ?? 'N/A'}</TableCell>
              <TableCell>£{entry.mileage?.amount?.toFixed(2) ?? 'N/A'}</TableCell>
              <TableCell>{entry.expenses?.description ?? 'N/A'}</TableCell>
              <TableCell>£{entry.expenses?.amount?.toFixed(2) ?? 'N/A'}</TableCell>
              <TableCell>{entry.overtime?.hours ?? 'N/A'}</TableCell>
              <TableCell>£{entry.overtime?.amount?.toFixed(2) ?? 'N/A'}</TableCell>
              <TableCell>{entry.sustenance?.description ?? 'N/A'}</TableCell>
              <TableCell>£{entry.sustenance?.amount?.toFixed(2) ?? 'N/A'}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => onEdit(entry)}
                    size="sm"
                    variant="outline"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => onDelete(entry._id)}
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
