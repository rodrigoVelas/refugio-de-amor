export default function Inicio() {
  const styles = {
    inicioContainer: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    },
    heroSection: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '4rem',
      padding: '4rem 2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      alignItems: 'center',
      minHeight: '70vh',
    },
    heroBadge: {
      display: 'inline-block',
      padding: '0.5rem 1rem',
      background: 'rgba(37, 99, 235, 0.1)',
      color: '#2563eb',
      borderRadius: '20px',
      fontSize: '0.875rem',
      fontWeight: 600,
      marginBottom: '1rem',
    },
    heroTitle: {
      fontSize: '3.5rem',
      fontWeight: 800,
      color: '#1e293b',
      lineHeight: 1.1,
      marginBottom: '1rem',
      letterSpacing: '-0.02em',
    },
    heroSubtitle: {
      fontSize: '1.25rem',
      color: '#64748b',
      lineHeight: 1.6,
      marginBottom: '2rem',
    },
    heroStats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '2rem',
    },
    statItem: {
      textAlign: 'center' as const,
    },
    statNumber: {
      fontSize: '2rem',
      fontWeight: 800,
      color: '#2563eb',
      lineHeight: 1,
    },
    statLabel: {
      fontSize: '0.875rem',
      color: '#64748b',
      marginTop: '0.5rem',
    },
    heroVisual: {
      position: 'relative' as const,
      height: '400px',
    },
    floatingCard: {
      position: 'absolute' as const,
      background: 'white',
      padding: '1rem 1.5rem',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      fontWeight: 600,
      color: '#1e293b',
      animation: 'float 6s ease-in-out infinite',
    },
    featuresSection: {
      padding: '4rem 2rem',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    sectionHeader: {
      textAlign: 'center' as const,
      marginBottom: '3rem',
    },
    sectionTitle: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#1e293b',
      marginBottom: '1rem',
      letterSpacing: '-0.02em',
    },
    sectionSubtitle: {
      fontSize: '1.125rem',
      color: '#64748b',
      maxWidth: '600px',
      margin: '0 auto',
    },
    featuresGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '2rem',
      justifyContent: 'center',
    },
    featureCard: {
      background: 'white',
      borderRadius: '20px',
      padding: '2rem',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      textDecoration: 'none',
      color: 'inherit',
      display: 'flex',
      flexDirection: 'column' as const,
      position: 'relative' as const,
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '2px solid transparent',
    },
    featureIcon: {
      width: '64px',
      height: '64px',
      background: 'rgba(37, 99, 235, 0.1)',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#2563eb',
      marginBottom: '1.5rem',
      transition: 'all 0.3s ease',
    },
    featureTitle: {
      fontSize: '1.5rem',
      fontWeight: 700,
      color: '#1e293b',
      marginBottom: '1rem',
    },
    featureDescription: {
      color: '#64748b',
      lineHeight: 1.6,
      marginBottom: '1.5rem',
      flexGrow: 1,
    },
    featureActions: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '0.5rem',
    },
    actionItem: {
      fontSize: '0.875rem',
      color: '#475569',
      display: 'flex',
      alignItems: 'center',
    },
    featureArrow: {
      position: 'absolute' as const,
      top: '2rem',
      right: '2rem',
      fontSize: '1.5rem',
      color: '#cbd5e1',
      transition: 'all 0.3s ease',
    },
    additionalFeatures: {
      background: 'white',
      padding: '4rem 2rem',
      marginTop: '2rem',
    },
    additionalGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '2rem',
      maxWidth: '800px',
      margin: '0 auto',
    },
    additionalCard: {
      textAlign: 'center' as const,
      padding: '2rem 1rem',
    },
    additionalIcon: {
      fontSize: '3rem',
      marginBottom: '1rem',
    },
    ctaSection: {
      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      color: 'white',
      padding: '4rem 2rem',
      textAlign: 'center' as const,
    },
    ctaButtons: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
    },
    btn: {
      padding: '1rem 2rem',
      borderRadius: '12px',
      fontWeight: 600,
      textDecoration: 'none',
      transition: 'all 0.3s ease',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    btnPrimary: {
      background: 'white',
      color: '#2563eb',
    },
    btnOutline: {
      background: 'transparent',
      color: 'white',
      border: '2px solid white',
    },
  };

  return (
    <>
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          
          .floating-card-1 {
            top: 20%;
            left: 10%;
            animation-delay: 0s;
          }
          
          .floating-card-2 {
            top: 50%;
            right: 10%;
            animation-delay: 2s;
          }
          
          .floating-card-3 {
            bottom: 20%;
            left: 20%;
            animation-delay: 4s;
          }
          
          .feature-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 40px rgba(37, 99, 235, 0.15);
            border-color: #2563eb;
          }
          
          .feature-card:hover .feature-icon {
            transform: scale(1.1);
            background: #2563eb;
            color: white;
          }
          
          .feature-card:hover .feature-arrow {
            color: #2563eb;
            transform: translateX(4px);
          }
          
          .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 255, 255, 0.3);
          }
          
          .btn-outline:hover {
            background: white;
            color: #2563eb;
          }
          
          @media (max-width: 768px) {
            .hero-section {
              grid-template-columns: 1fr !important;
              gap: 2rem !important;
              padding: 2rem 1rem !important;
              text-align: center;
            }
            
            .hero-title {
              font-size: 2.5rem !important;
            }
            
            .section-title {
              font-size: 2rem !important;
            }
            
            .features-grid {
              grid-template-columns: 1fr !important;
            }

            .additional-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
      
      <div style={styles.inicioContainer}>
        {/* Hero Section */}
        <div style={styles.heroSection} className="hero-section">
          <div>
            <div style={styles.heroBadge}>
              Sistema de Gestión
            </div>
            <h1 style={styles.heroTitle} className="hero-title">
              Refugio de Amor
            </h1>
            <p style={styles.heroSubtitle}>
              Plataforma integral para la gestión y cuidado de niños en situación de vulnerabilidad
            </p>
            <div style={styles.heroStats}>
              <div style={styles.statItem}>
                <div style={styles.statNumber}>+500</div>
                <div style={styles.statLabel}>Niños Atendidos</div>
              </div>
              <div style={styles.statItem}>
                <div style={styles.statNumber}>15</div>
                <div style={styles.statLabel}>Niveles Educativos</div>
              </div>
              <div style={styles.statItem}>
                <div style={styles.statNumber}>24/7</div>
                <div style={styles.statLabel}>Atención Continua</div>
              </div>
            </div>
          </div>
          <div style={styles.heroVisual}>
            <div style={{...styles.floatingCard}} className="floating-card-1">
              <div style={{fontSize: '1.5rem'}}>👥</div>
              <div>Gestión de Niños</div>
            </div>
            <div style={{...styles.floatingCard}} className="floating-card-2">
              <div style={{fontSize: '1.5rem'}}>📋</div>
              <div>Actividades Pendientes</div>
            </div>
            <div style={{...styles.floatingCard}} className="floating-card-3">
              <div style={{fontSize: '1.5rem'}}>⏰</div>
              <div>Seguimiento Integral</div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div style={styles.featuresSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle} className="section-title">¿Qué puedes hacer con el sistema?</h2>
            <p style={styles.sectionSubtitle}>
              Herramientas diseñadas para facilitar el cuidado y seguimiento integral
            </p>
          </div>

          <div style={styles.featuresGrid} className="features-grid">
            <a href="/ninos" style={styles.featureCard} className="feature-card">
              <div style={styles.featureIcon} className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 style={styles.featureTitle}>Gestión de Niños</h3>
                <p style={styles.featureDescription}>
                  Registra, edita y gestiona la información completa de cada niño. 
                  Historial educativo y seguimiento personalizado con todas las herramientas necesarias para brindar el mejor cuidado.
                </p>
                <div style={styles.featureActions}>
                  <span style={styles.actionItem}>• Registro completo de información personal</span>
                  <span style={styles.actionItem}>• Búsqueda avanzada y filtros inteligentes</span>
                  <span style={styles.actionItem}>• Seguimiento de progreso individualizado</span>
                </div>
              </div>
              <div style={styles.featureArrow} className="feature-arrow">→</div>
            </a>

            <a href="/actividades" style={styles.featureCard} className="feature-card">
              <div style={styles.featureIcon} className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11H15M9 15H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1046 21 18 21H17ZM17 21V11H13V7H7V19H17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 style={styles.featureTitle}>Actividades Pendientes</h3>
                <p style={styles.featureDescription}>
                  Organiza y da seguimiento a todas las actividades pendientes, tareas programadas y recordatorios importantes para cada niño y el personal del refugio.
                </p>
                <div style={styles.featureActions}>
                  <span style={styles.actionItem}>• Lista de tareas por niño y por personal</span>
                  <span style={styles.actionItem}>• Recordatorios automáticos</span>
                  <span style={styles.actionItem}>• Priorización de actividades urgentes</span>
                  <span style={styles.actionItem}>• Seguimiento de cumplimiento</span>
                </div>
              </div>
              <div style={styles.featureArrow} className="feature-arrow">→</div>
            </a>
          </div>
        </div>

        {/* Additional Features */}
        <div style={styles.additionalFeatures}>
          <div style={styles.additionalGrid}>
            <div style={styles.additionalCard}>
              <div style={styles.additionalIcon}>📋</div>
              <h4 style={{fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem'}}>Gestión de Actividades</h4>
              <p style={{color: '#64748b', lineHeight: 1.5}}>Planifica y organiza actividades recreativas, educativas y terapéuticas. Control completo del calendario de eventos y seguimiento de participación.</p>
            </div>
            <div style={styles.additionalCard}>
              <div style={styles.additionalIcon}>🔒</div>
              <h4 style={{fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem'}}>Seguridad y Privacidad</h4>
              <p style={{color: '#64748b', lineHeight: 1.5}}>Información protegida con los más altos estándares de seguridad. Control de acceso por roles y encriptación de datos sensibles.</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div style={styles.ctaSection}>
          <div>
            <h2 style={{fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem'}}>Comienza a gestionar tu app de refugio</h2>
            <p style={{fontSize: '1.25rem', opacity: 0.9, marginBottom: '2rem'}}>Todo lo que necesitas para brindar el mejor cuidado y seguimiento</p>
            <div style={styles.ctaButtons}>
              <a href="/ninos" style={{...styles.btn, ...styles.btnPrimary}} className="btn-primary">Comenzar Ahora</a>
              <a href="/actividades" style={{...styles.btn, ...styles.btnOutline}} className="btn-outline">Ver Actividades</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}