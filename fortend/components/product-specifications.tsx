import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export interface ProductSpecifications {
  key: string;
  value: string;
}

export function ProductSpecifications({specifications}: { specifications: ProductSpecifications[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-1/3">规格</TableHead>
          <TableHead>参数</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {specifications.map((spec, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{spec.key}</TableCell>
            <TableCell>{spec.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}