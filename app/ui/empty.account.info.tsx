import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmptyAccountInfo() {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
        <CardDescription>Connect your wallet to view account details</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-8">
        <p className="text-muted-foreground">No wallet connected</p>
      </CardContent>
    </Card>
  )

}
