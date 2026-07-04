import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import InboxPage from './InboxPage';
import RoutingRulesPage from './RoutingRulesPage';
import EmailTemplatesPage from './EmailTemplatesPage';
import { Mail, GitBranch, FileText } from 'lucide-react';

export default function AdminCommsPage() {
  const [tab, setTab] = useState('inbox');

  return (
    <div data-testid="admin-comms-page">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Comunicazioni</h1>
        <p className="text-base text-gray-500">Gestisci posta in arrivo, regole di instradamento e template email.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="inbox" className="gap-1.5" data-testid="comms-tab-inbox">
            <Mail className="w-3.5 h-3.5" /> Posta in arrivo
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5" data-testid="comms-tab-rules">
            <GitBranch className="w-3.5 h-3.5" /> Regole
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5" data-testid="comms-tab-templates">
            <FileText className="w-3.5 h-3.5" /> Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <InboxPage />
        </TabsContent>
        <TabsContent value="rules">
          <RoutingRulesPage />
        </TabsContent>
        <TabsContent value="templates">
          <EmailTemplatesPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
