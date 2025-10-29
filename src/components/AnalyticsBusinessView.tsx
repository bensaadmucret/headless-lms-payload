import React from "react";
import AnalyticsBusinessDashboard from "./AnalyticsBusinessDashboard";

interface AnalyticsBusinessViewProps {
  user: {
    role?: string;
  };
  canAccessAdmin: boolean;
}

const AnalyticsBusinessView: React.FC<AnalyticsBusinessViewProps> = ({
  user,
  canAccessAdmin,
}) => {
  if (
    !canAccessAdmin &&
    user?.role !== "superadmin" &&
    user?.role !== "admin"
  ) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Accès non autorisé
        </h2>
        <p className="text-gray-600">
          Vous n&apos;avez pas les permissions nécessaires pour accéder aux
          analytics business.
        </p>
      </div>
    );
  }

  return (
    <div className="analytics-business-view">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Analytics Business MedCoach
        </h1>
        <p className="text-gray-600 mt-2">
          Tableau de bord dédié à l'analyse de la performance du tunnel
          d'acquisition et des revenus.
        </p>
      </div>

      <AnalyticsBusinessDashboard className="payload-admin-analytics" />
    </div>
  );
};

export default AnalyticsBusinessView;
