import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import RoleRoute from "./components/RoleRoute";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const UsuarioForm = lazy(() => import("./pages/UsuarioForm"));
const Agendamentos = lazy(() => import("./pages/Agendamentos"));
const AgendamentoForm = lazy(() => import("./pages/AgendamentoForm"));
const AgendamentoDetalhe = lazy(() => import("./pages/AgendamentoDetalhe"));
const Disponibilidade = lazy(() => import("./pages/Disponibilidade"));
const DisponibilidadeForm = lazy(() => import("./pages/DisponibilidadeForm"));
const Relatorios = lazy(() => import("./pages/Relatorios"));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">
      Carregando...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />

          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/usuarios" element={<Usuarios />} />
            <Route element={<RoleRoute allowed={["Administrador"]} />}>
              <Route path="/usuarios/novo" element={<UsuarioForm />} />
            </Route>
            <Route element={<RoleRoute allowed={["Administrador", "Atendente", "Cliente"]} />}>
              <Route path="/usuarios/editar/:id" element={<UsuarioForm />} />
            </Route>

            <Route path="/agendamentos" element={<Agendamentos />} />
            <Route element={<RoleRoute allowed={["Cliente", "Administrador"]} />}>
              <Route path="/agendamentos/novo" element={<AgendamentoForm />} />
            </Route>
            <Route element={<RoleRoute allowed={["Administrador", "Atendente"]} />}>
              <Route path="/agendamentos/editar/:id" element={<AgendamentoForm />} />
            </Route>
            <Route path="/agendamentos/:id" element={<AgendamentoDetalhe />} />

            <Route element={<RoleRoute allowed={["Administrador"]} />}>
              <Route path="/disponibilidade" element={<Disponibilidade />} />
              <Route path="/disponibilidade/nova" element={<DisponibilidadeForm />} />
              <Route path="/disponibilidade/editar/:id" element={<DisponibilidadeForm />} />
            </Route>
            <Route element={<RoleRoute allowed={["Administrador", "Atendente"]} />}>
              <Route path="/relatorios" element={<Relatorios />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}