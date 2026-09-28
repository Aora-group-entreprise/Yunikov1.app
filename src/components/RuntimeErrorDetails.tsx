'use client';

interface RuntimeErrorDetailsProps {
   title?: string;
   message: string;
   stack?: string | null;
}

export default function RuntimeErrorDetails({
   title = 'Erreur réelle du serveur',
   message,
   stack,
}: RuntimeErrorDetailsProps) {
   return (
      <section style={{
         margin: '24px auto',
         width: 'min(900px, calc(100% - 32px))',
         padding: 20,
         borderRadius: 16,
         background: '#fff7f7',
         border: '1px solid #f0b7b7',
         color: '#351313',
         fontFamily: 'system-ui, sans-serif',
      }}>
         <strong style={{ display: 'block', marginBottom: 10 }}>{title}</strong>
         <pre style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 13,
            lineHeight: 1.5,
         }}>{message}</pre>
         {stack ? (
            <details style={{ marginTop: 14 }}>
               <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Stack trace</summary>
               <pre style={{
                  marginTop: 10,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 12,
                  lineHeight: 1.45,
               }}>{stack}</pre>
            </details>
         ) : null}
      </section>
   );
}
