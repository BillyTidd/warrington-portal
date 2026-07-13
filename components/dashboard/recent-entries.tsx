import { formatDistanceToNow } from "date-fns";
// import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Entry {
  _id: string;
  date: string;
  client: string;
  description: string;
  totalAmount: number;
  userName?: string;
  status?: string;
}

interface RecentEntriesProps {
  entries: Entry[];
}

export function RecentEntries({ entries }: RecentEntriesProps) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[80px]">Employee</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="hidden md:table-cell">Description</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No entries found.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => {
              // Get initials for avatar
              const initials = entry.userName
                ? entry.userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                : "U";

              // Determine status badge color
              const getStatusColor = (amount: number) => {
                if (amount > 1000) return "success";
                if (amount > 500) return "warning";
                return "default";
              };

              return (
                <TableRow key={entry._id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar> */}
                      <span className="hidden md:inline">
                        {entry.userName || "Unknown"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{entry.client}</TableCell>
                  <TableCell className="hidden max-w-[200px] truncate md:table-cell">
                    {entry.description}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.date), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant="default">£{entry.totalAmount}</Badge>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
