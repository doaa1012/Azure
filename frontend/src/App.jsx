import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import ObjectInfoList from './components/A/A01/ObjectInfoList';
import CreateSwitch from './CreateSwitch';
import MainLayout from './components/A/A01/MainLayout';
import Home from './components/Home';
import AreaA from './components/A/AreaA';
import AreaB from './components/B/AreaB';
import AreaC from './components/C/AreaC';
import GroupDetail from './components/A/A01/GroupDetail';
import ObjectDetail from './components/A/A01/ObjectDetail';
import PeriodicTableSearch from './components/PeriodicTableElements/PeriodicTableSearch';
import WorkflowTable from './components/WorkflowStage';
import ElementCompositionReport from './components/Reports/ElementCompositionReport'
import SampleTable from './components/Samples/SampleTable';
import MonthlyObjectIncrease from './components/Reports/MonthlyObjectIncrease';
import SynthesisRequestsTable from './components/Reports/SynthesisRequestsTable';
import ObjectStatisticsTable from './components/Reports/ObjectStatisticsTable';
import IdeasAndExperimentsTable from './components/Reports/IdeasAndExperimentsTable';
import SamplesPerElementChart from './components/Reports/SampleElementReport';
import ObjectSearchPage from './components/ObjectSearchPage';
import WorkflowDetail from './components/DynamicWorkflow/WorkflowDetail';
import DynamicWorkflowCreator from './components/DynamicWorkflow/WorkflowCreation';
import AllWorkflows from './components/DynamicWorkflow/AllWorkflows';
import RenderWorkflowPage from './components/DynamicWorkflow/RenderWorkflowPage';
import WorkflowDynamic from './components/DynamicWorkflow/WorkflowDynamic';
import ListEditor from './components/Create_object/ListOfObjects';
import Register from './components/Registration/Registration Form';
import Login from './components/Registration/Login Form';
import CreateChild from './components/Create_object/CreateContainer';
import GeneralInfoList from './components/A/A01/GeneralInfoList';
import DragDropFileUpload from './components/Create_object/UploadFile';
import HandoverReport from './components/A/A01/HandoverReport';
import EditDispatcher from './EditDispatcher';
import EditAssociatedObjects from './components/edit_delete/EditAssociatedObjects';
import WelcomePage from './components/Registration/WelcomePage';
import AddHandoverForm from './components/Create_object/AddHandoverForm';
import FileProcessingPage from './components/Create_object/FileProcessingPage';
import AddPropertyForm from './components/Create_object/AddPropertyForm';
import DragAndDropFileUploadProperty from './components/Create_object/DragAndDropFileUploadProperty';
import CsvViewerPage from './components/CSVTable';
import EditRubricChild from './components/edit_delete/EditChild';
import { useAuth, AuthProvider } from './components/AuthContext';
import EditPropertyPage from './components/edit_delete/EditPropertyPage';
import AccountSettings from './components/Account_setting/AccountSettings';
import SampleAssociationSearch from './components/Wrapper';
import ObjectGraph from './components/A/A01/ObjectGraphPage';
import UserHandoverReport from './components/A/A01/UserHandoverReport';
import EmptySamplesTable from './components/Reports/EmptySamplesTable';
import GoogleAuthSuccess from './components/Registration/GoogleAuthSuccess';
import { TourProvider } from './components/Tour/TourProvider';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-slate-100 min-h-screen">
      <Router>
        <Routes>
          <Route path="/start" element={<WelcomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
           <Route path="/google-auth-success" element={<GoogleAuthSuccess />} />

          <Route element={<MainLayout />}>
            <Route path="/" element={isAuthenticated ? <Home /> : <Navigate to="/start" />} />
            <Route path="/identity" element={isAuthenticated ? <AccountSettings /> : <Navigate to="/start" />} />
            <Route path="/search" element={isAuthenticated ? <PeriodicTableSearch /> : <Navigate to="/start" />} />
            <Route path="/reports" element={isAuthenticated ? <ElementCompositionReport /> : <Navigate to="/start" />} />
            <Route path="/MonthlyObjectIncrease" element={isAuthenticated ? <MonthlyObjectIncrease /> : <Navigate to="/start" />} />
            <Route path="/SynthesisRequestsTable" element={isAuthenticated ? <SynthesisRequestsTable /> : <Navigate to="/start" />} />
            <Route path="/ObjectStatisticsTable" element={isAuthenticated ? <ObjectStatisticsTable /> : <Navigate to="/start" />} />
            <Route path="/IdeasAndExperimentsTable" element={isAuthenticated ? <IdeasAndExperimentsTable /> : <Navigate to="/start" />} />
            <Route path="/SamplesPerElementChart" element={isAuthenticated ? <SamplesPerElementChart /> : <Navigate to="/start" />} />
            <Route path="/queryform" element={isAuthenticated ? <ObjectSearchPage /> : <Navigate to="/start" />} />
            <Route path="/area-a" element={isAuthenticated ? <AreaA /> : <Navigate to="/start" />} />
            <Route path="/general/:area" element={isAuthenticated ? <GeneralInfoList /> : <Navigate to="/start" />} />
            <Route path="/workflow-stage/:objectId" element={isAuthenticated ? <WorkflowTable /> : <Navigate to="/start" />} />
            <Route path="/SampleTable" element={isAuthenticated ? <SampleTable /> : <Navigate to="/start" />} />
            <Route path="/WorkflowCreation" element={isAuthenticated ? <DynamicWorkflowCreator /> : <Navigate to="/start" />} />
            <Route path="/workflows" element={isAuthenticated ? <AllWorkflows /> : <Navigate to="/start" />} />
            <Route path="/workflows/:id" element={isAuthenticated ? <WorkflowDetail /> : <Navigate to="/start" />} />
            <Route path="/render-workflow" element={isAuthenticated ? <RenderWorkflowPage /> : <Navigate to="/start" />} />
            <Route path="/workflows-table/:id" element={isAuthenticated ? <WorkflowDynamic /> : <Navigate to="/start" />} />
            <Route path="/object/:objectId" element={isAuthenticated ? <ObjectDetail /> : <Navigate to="/start" />} />
            <Route path="/group/:RubricNameUrl" element={isAuthenticated ? <GroupDetail /> : <Navigate to="/start" />} />

            <Route path="/:area" element={isAuthenticated ? <ObjectInfoList /> : <Navigate to="/start" />} />

            <Route path="/area-b" element={isAuthenticated ? <AreaB /> : <Navigate to="/start" />} />

            <Route path="/area-c" element={isAuthenticated ? <AreaC /> : <Navigate to="/start" />} />

           
            <Route path="/list-of-objects" element={isAuthenticated ? <ListEditor /> : <Navigate to="/start" />} />

            {/* Route with groupName as a parameter */}
            <Route path="/list-of-objects/:RubricNameUrl" element={isAuthenticated ? <ListEditor /> : <Navigate to="/start" />} />

            {/* Route with objectnameurl as a parameter for rubric-specific list editing */}
            <Route path="/list-of-objects/url/:objectnameurl" element={isAuthenticated ? <ListEditor /> : <Navigate to="/start" />} />
            <Route path="/wrapper" element={isAuthenticated ? <SampleAssociationSearch /> : <Navigate to="/start" />} />

            <Route path="/create/:typeName" element={isAuthenticated ? <CreateSwitch /> : <Navigate to="/start" />} />
            <Route path="/create/new_container/:url_parent" element={isAuthenticated ? <CreateChild /> : <Navigate to="/start" />} />
            <Route path="/add-property/:objectId" element={isAuthenticated ? <AddPropertyForm /> : <Navigate to="/start" />} />
            <Route path="/upload-properties/:objectId" element={isAuthenticated ? <DragAndDropFileUploadProperty /> : <Navigate to="/start" />} />
            <Route path="/create/upload_files" element={isAuthenticated ? <DragDropFileUpload /> : <Navigate to="/start" />} />
            <Route path="/file-processing" element={isAuthenticated ? <FileProcessingPage /> : <Navigate to="/start" />} />
            <Route path="/add-handover-form/:objectId" element={isAuthenticated ? <AddHandoverForm /> : <Navigate to="/start" />} />
            <Route path="/handover-report" element={isAuthenticated ? <HandoverReport /> : <Navigate to="/start" />} />
            <Route path="/edit/rubric/:rubricId" element={isAuthenticated ? <EditRubricChild /> : <Navigate to="/start" />} />
            <Route path="/edit/object/:objectType/:objectId" element={isAuthenticated ? <EditDispatcher /> : <Navigate to="/start" />} />
            <Route path="/edit-associated-objects/:objectId" element={isAuthenticated ? <EditAssociatedObjects /> : <Navigate to="/start" />} />
            <Route path="/edit-property/:propertyId" element={isAuthenticated ?<EditPropertyPage />: <Navigate to="/start" />} />
            <Route path="/csv-viewer/:objectId" element={isAuthenticated ?<CsvViewerPage />: <Navigate to="/start" />} />
            <Route path="/object/graph/:objectnameurl" element={isAuthenticated ? <ObjectGraph /> : <Navigate to="/start" />} />
            <Route path="/User_Handover_Report" element={isAuthenticated ?<UserHandoverReport />: <Navigate to="/start" />} />
            <Route path="/empty-samples" element={isAuthenticated ? <EmptySamplesTable /> : <Navigate to="/start" />}/>
           
        

          </Route>
        </Routes>
      </Router>
    </div>
  );
}

export default function AppWithProvider() {
  return (
    <AuthProvider>
      <TourProvider>
        <App />
      </TourProvider>
    </AuthProvider>
  );
}
