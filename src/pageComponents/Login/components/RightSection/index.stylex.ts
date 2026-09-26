import * as stylex from '@stylexjs/stylex';

export const styles = stylex.create({
   root: {
      width: '100%',
      maxWidth: '430px',
      minHeight: '100dvh',
      backgroundColor: '#0d0715',
      display: 'flex',
      flexDirection: 'column',
      margin: '0 auto',
   },
   titleContainer: {
      fontSize: '24px',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#ffffff',
   },
   successAlert: {
      color: '#86efac',
      fontSize: '14px',
      lineHeight: 1.5,
   },
   errorAlert: {
      color: '#fca5a5',
      fontSize: '14px',
      lineHeight: 1.5,
   },
});
