import React, { useState, useEffect } from "react";
import Navbar from "../../components/mainComponents/Navbar";
import Sidebar from "../../components/mainComponents/Sidebar";
import SearchDataTable from "../../components/tables/SearchDataTable";
import EditModal from "../../components/common/EditModal";
import { 
  fetchEmployees, 
  updateEmployeeStatus, 
  fetchEmployeeById, 
  updateEmployee,
  createEmployee
} from "../../services/AxiosUser";
import Switch from '@mui/material/Switch';
import Checkbox from '@mui/material/Checkbox';
import { styled } from '@mui/material/styles';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddButton from "../../components/common/AddButton";

// Custom styled switch for active/inactive status
const StatusSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: '#4caf50',
    '&:hover': {
      backgroundColor: '#4caf5014',
    },
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: '#4caf50',
  },
  '& .MuiSwitch-switchBase': {
    color: '#f44336',
  },
  '& .MuiSwitch-track': {
    backgroundColor: '#f44336',
  },
}));

const EmployeePortal = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        phoneNumber: "",
        address: "",
        birthDate: "",
        gender: "MALE",
        department: "ACCOUNTING",
        active: true,
        isAdmin: false
    });

    // Setup columns including status toggle - replaced position with email
    const columns = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'firstName', headerName: 'First name', width: 130 },
        { field: 'lastName', headerName: 'Last name', width: 130 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'phoneNumber', headerName: 'Phone', width: 150 },
        { field: 'department', headerName: 'Department', width: 150 },
        { 
            field: 'isAdmin', 
            headerName: 'Admin', 
            width: 80,
            renderCell: (params) => (
                <Checkbox checked={params.value} disabled />
            ),
        },
        {
            field: 'active',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <StatusSwitch
                    checked={params.value}
                    onChange={(event) => {
                        event.stopPropagation(); 
                        handleStatusToggle(params.row);
                    }}
                    onClick={(event) => event.stopPropagation()} 
                />
            ),
        },
    ];
    
    // Load employees on component mount
    useEffect(() => {
        loadEmployees();
    }, []);
    
    const loadEmployees = async () => {
        try {
            setLoading(true);
            const data = await fetchEmployees();
            const rowData = data.data.rows;
            
            const formattedRows = rowData.map((row) => ({
                id: row.id,
                firstName: row.firstName,
                lastName: row.lastName,
                email: row.email, // Include email in the rows
                phoneNumber: row.phoneNumber,
                department: row.department || 'N/A',
                isAdmin: row.isAdmin || false,
                active: row.active || false,
                // Store original data for update
                originalData: { ...row }
            }));
            
            setRows(formattedRows);
        } catch (err) {
            console.error(err);
            setError("Failed to load employees data");
        } finally {
            setLoading(false);
        }
    };

    const transformDateForApi = (dateString) => {
        // Skip if empty
        if (!dateString) return null;

        try {
            // Expecting "DD-MM-YYYY" => split by '-'
            const [day, month, year] = dateString.split('-');

            // Validate we got three parts
            if (!day || !month || !year) return null;

            // Construct "YYYYMMDD" and parse it as a number
            const resultString = `${year}${month}${day}`; // "20020302"

            // Optionally add further checks for valid day/month/year ranges
            return Number(resultString);

        } catch (error) {
            console.error('Error converting date:', error);
            return null;
        }
    };

    
    
    // Handle toggle of active status
    const handleStatusToggle = async (row) => {

        if(!row.isAdmin) {

            try {
                // Ensure we have all the original data from the row
                console.log("Original row data:", row);

                // Create a clean employee object with all required fields
                const employeeData = {
                    ...row.originalData,
                    active: !row.active // Toggle the current status
                };
                const activeSwitch = {
                    "active": employeeData.active
                }

                await updateEmployeeStatus(row.id, activeSwitch);

                // Update local state after successful API call
                setRows(prevRows =>
                    prevRows.map(r =>
                        r.id === row.id
                            ? {...r, active: !r.active}
                            : r
                    )
                );

                toast.success(`Employee ${row.firstName} ${row.lastName} status updated successfully`);
            } catch (error) {
                console.error("Error updating employee status:", error);
                toast.error(`Failed to update employee status: ${error.message}`);
            }
        } else {
            toast.error("Admin cannot change the status of admin.")
        }
    };

    const validatePhoneNumber = (phoneNumber) => {
        if (!phoneNumber.startsWith("+381")) {
            toast.error("Phone number must start with +381.");
            return false;
        }

        const digitsAfterPrefix = phoneNumber.slice(4).trim(); // Uklanja "+381" i ostavlja ostatak broja

        if (digitsAfterPrefix.length < 8 || isNaN(digitsAfterPrefix)) {
            toast.error("Phone number must contain exactly 8 digits after +381.");
            return false;
        }

        return true;
    };

    const validateAddress = (address) => {
        if (!address) {
            toast.error("Address cannot be empty.");
            return false;
        }

        // Proverava da li postoji bar jedan broj u stringu
        const hasNumber = address.split("").some(char => !isNaN(char) && char !== " ");

        if (!hasNumber) {
            toast.error("Address must contain at least one number.");
            return false;
        }

        return true;
    };


    const validateEmail = (email) => {
        email = email.trim();
        console.log("Validating email:", email); // Provera
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Invalid email format.");
            return false;
        }

        return true;
    };

    const validateBirthDate = (birthDate) => {
        if (!birthDate) {
            toast.error("Birth date is required.");
            return false;
        }

        return true;
    };


    const handleCreateEmployee = async (employeeData) => {
        if (!validatePhoneNumber(employeeData.phoneNumber) ) {
            return;
        }

        if (!validateEmail(employeeData.email)) {
            return;
        }

        if (!validateAddress(employeeData.address)) {
            return;
        }
        if (!validateBirthDate(employeeData.birthDate)) {
            return;
        }

        try {
            const employeePayload = {
                firstName: employeeData.firstName,
                lastName: employeeData.lastName,
                username: employeeData.username,
                email: employeeData.email,
                phoneNumber: employeeData.phoneNumber,
                address: employeeData.address,
                birthDate: transformDateForApi(employeeData.birthDate),
                gender: employeeData.gender,
                position: "NONE", // Hardcoded as requested
                department: employeeData.department,
                active: employeeData.active,
                isAdmin: employeeData.isAdmin,
                permissions: ["user.employee.create"] // Default permission
            };
            
            await createEmployee(employeePayload);
            setIsCreateModalOpen(false);
            resetEmployeeForm();
            toast.success('Employee created successfully');
            loadEmployees(); // Reload the data to reflect changes
        } catch (error) {
            toast.error(`Failed to create employee: ${error.message}`);
        }
    };

    const resetEmployeeForm = () => {
        setNewEmployee({
            firstName: "",
            lastName: "",
            username: "",
            email: "",
            phoneNumber: "",
            address: "",
            birthDate: "",
            gender: "MALE",
            department: "ACCOUNTING",
            active: true,
            isAdmin: false
        });
    };
    
    const handleRowClick = async (row) => {

        if(!row.isAdmin) {
            try {
                const response = await fetchEmployeeById(row.id);
                // console.log(response);

                // Extract the actual employee data, avoiding nested data structures
                const employeeData = response.data || response;

                // Create a clean employee object
                const cleanEmployeeData = {
                    id: row.id,
                    firstName: employeeData.firstName,
                    lastName: employeeData.lastName,
                    username: employeeData.username,
                    email: employeeData.email,
                    phoneNumber: employeeData.phoneNumber,
                    address: employeeData.address,
                    birthDate: employeeData.birthDate,
                    gender: employeeData.gender,
                    department: employeeData.department,
                    active: employeeData.active,
                    isAdmin: employeeData.isAdmin
                    // Removed position from here
                };

                setSelectedEmployee(cleanEmployeeData);
                setIsEditModalOpen(true);
            } catch (error) {
                toast.error(`Error fetching employee details: ${error.message}`);
            }
        } else {
            toast.error(`Admin cannot edit admin.`);
        }
    };
    
    const handleSaveEmployee = async (updatedEmployeeData) => {
        if (!validatePhoneNumber(updatedEmployeeData.phoneNumber)) {
            return;
        }

        if(!validateEmail(updatedEmployeeData.email)){
            return;
        }
        if (!validateAddress(updatedEmployeeData.address)) {
            return;
        }
        if (!validateBirthDate(updatedEmployeeData.birthDate)) {
            return;
        }
        try {
            // Make sure we have an ID before making the request
            if (!updatedEmployeeData.id) {
                toast.error('Employee ID is missing');
                return;
            }
            
            // Create a clean object to send to the API
            const employeePayload = {
                firstName: updatedEmployeeData.firstName,
                lastName: updatedEmployeeData.lastName,
                username: updatedEmployeeData.username,
                email: updatedEmployeeData.email,
                phoneNumber: updatedEmployeeData.phoneNumber,
                address: updatedEmployeeData.address,
                birthDate: updatedEmployeeData.birthDate,
                gender: updatedEmployeeData.gender,
                position: "NONE",
                department: updatedEmployeeData.department,
                active: updatedEmployeeData.active,
                isAdmin: updatedEmployeeData.isAdmin
            };
            
            await updateEmployee(updatedEmployeeData.id, employeePayload);
            setIsEditModalOpen(false);
            toast.success('Employee updated successfully');
            loadEmployees();
        } catch (error) {
            toast.error(`Failed to update employee: ${error.message}`);
        }
    };

    const employeeFormFields = [
        { name: 'firstName', label: 'First Name', required: true },
        { name: 'lastName', label: 'Last Name', required: true },
        { name: 'username', label: 'Username', required: true },
        { name: 'email', label: 'Email', required: true, type: 'email' },
        { name: 'phoneNumber', label: 'Phone Number' },
        { name: 'address', label: 'Address' },
        { name: 'birthDate', label: 'Birth Date', type: 'date' },
        { name: 'gender', label: 'Gender', type: 'select', options: [
            { value: 'MALE', label: 'Male' },
            { value: 'FEMALE', label: 'Female' },
        ] },
        // Removed position field from here
        { name: 'department', label: 'Department', type: 'select', options: [
            { value: 'ACCOUNTING', label: 'Accounting' },
            { value: 'MARKETING', label: 'Marketing' },
            { value: 'HR', label: 'HR' },
            { value: 'SALES', label: 'Sales' },
            { value: 'IT', label: 'IT' },
            { value: 'SUPERVISOR', label: 'Supervisor' },
            { value: 'AGENT', label: 'Agent' }
        ] },
        { name: 'active', label: 'Active', type: 'switch' },
        { name: 'isAdmin', label: 'Admin', type: 'switch' }
    ];
    
    return (
        <div>

            <Sidebar/>
            <div style={{ padding: '20px', marginTop: '64px' }}>
                <h2>Employee Management</h2>
                    {loading ? (
                        <p>Loading employee data...</p>
                    ) : error ? (
                        <p>Error: {error}</p>
                    ) : (
                        <SearchDataTable 
                            rows={rows} 
                            columns={columns} 
                            checkboxSelection={false}
                            onRowClick={handleRowClick}
                            actionButton={<AddButton onClick={() => setIsCreateModalOpen(true)} label="Add Employee" />}
                        />
                    )}
                {/* Edit Modal */}
                {selectedEmployee && (
                    <EditModal
                        open={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        data={selectedEmployee}
                        formFields={employeeFormFields}
                        onSave={handleSaveEmployee}
                        title="Edit Employee"
                    />
                )}
                
                {/* Create Modal */}
                <EditModal
                    open={isCreateModalOpen}
                    onClose={() => 
                        {setIsCreateModalOpen(false);
                        resetEmployeeForm();
                    }}
                    data={newEmployee}
                    formFields={employeeFormFields}
                    onSave={handleCreateEmployee}
                    title="Create New Employee"
                />
                
                <ToastContainer position="bottom-right" />
            </div>
        </div>
    );
};

export default EmployeePortal;