import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Clock } from 'lucide-react';

export default function PlaceholderPage({ title, description, backTo }) {
  const navigate = useNavigate();
  return (
    <div data-testid="placeholder-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">{title}</h1>
        <p className="text-base text-gray-500">{description}</p>
      </div>
      <Card className="border-gray-100 border-dashed border-2">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700 ariadne-heading mb-2">In arrivo</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
            Questa funzionalita e in fase di sviluppo e sara disponibile a breve.
          </p>
          {backTo && (
            <Button variant="outline" onClick={() => navigate(backTo)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Torna indietro
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
