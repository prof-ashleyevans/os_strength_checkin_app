'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Athlete = {
    id: string
    first_name: string
    last_name: string
    email: string
    current_week: number
    last_checkin: string | null
    assigned_date: string
    program: {
        name: string
        duration: number
    } | null
}

const calculateExpectedWeek = (assignedDate: string, duration: number) => {
    const start = new Date(assignedDate)
    const now = new Date()
    const diffWeeks = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1
    return Math.min(diffWeeks, duration)
}


export default function AdminPage() {
    const [athletes, setAthletes] = useState<Athlete[]>([])
    const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
    const [programs, setPrograms] = useState<{ id: string; name: string; duration: number }[]>([])
    const [assignMode, setAssignMode] = useState(false)
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
    const [editAssignDate, setEditAssignDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [bulkAssignDate, setBulkAssignDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [sortKey, setSortKey] = useState<keyof Athlete | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
    const [showAddForm, setShowAddForm] = useState(false)
    const [editMode, setEditMode] = useState<string | null>(null)
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editCurrentWeek, setEditCurrentWeek] = useState<number>(1);
    const [showAddProgramForm, setShowAddProgramForm] = useState(false);
    const [editProgramId, setEditProgramId] = useState<string | null>(null)
    const [editProgramName, setEditProgramName] = useState<string>('')
    const [editProgramDuration, setEditProgramDuration] = useState<number>(4)

    const [newProgram, setNewProgram] = useState({
        name: '',
        duration: 4,
    });

    const [newAthlete, setNewAthlete] = useState({
        first_name: '',
        last_name: '',
        email: '',
        program_id: '',
        assigned_date: new Date().toISOString().split('T')[0]
    })

    const isEndingSoon = (athlete: Athlete) => {
        const currentWeek = athlete.current_week
        const programDuration = athlete.program?.duration ?? 0

        return currentWeek >= programDuration - 1 // Highlight if it's the last or second-to-last week
    }



    useEffect(() => {
        const fetchAthletes = async () => {
            const { data, error } = await supabase
                .from('athletes')
                .select(`
                        id,
                        first_name,
                        last_name,
                        email,
                        current_week,
                        last_checkin,
                        assigned_date,
                        program:program_id (
                          name,
                          duration
                        )
                      `)
                .order('last_name')

            if (!error && data) {
                const formatted = data.map((athlete) => ({
                    ...athlete,
                    program: Array.isArray(athlete.program) ? athlete.program[0] : athlete.program,
                }));
                setAthletes(formatted as Athlete[]);
            }
        }

        const fetchPrograms = async () => {
            const { data, error } = await supabase.from('programs').select('*').order('name')
            if (!error && data) setPrograms(data)
        }

        fetchAthletes()
        fetchPrograms()
    }, [])

    const sortedAthletes = useMemo(() => {
        if (!sortKey) return athletes
        return [...athletes].sort((a, b) => {
            const aVal = a[sortKey]
            const bVal = b[sortKey]

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal)
            }

            return 0
        })
    }, [athletes, sortKey, sortDirection])

    const toggleSort = (key: keyof Athlete) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDirection('asc')
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

            {showAddProgramForm && (
                <div className="border p-4 mb-6 bg-gray-800  rounded">
                    <h2 className="text-lg font-bold mb-2">Create New Program</h2>
                    <input
                        className="border p-2 mb-2 w-full"
                        placeholder="Program Name"
                        value={newProgram.name}
                        onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                    />
                    <input
                        type="number"
                        className="border p-2 mb-4 w-full"
                        placeholder="Duration (in weeks)"
                        value={newProgram.duration}
                        min={1}
                        onChange={(e) => setNewProgram({ ...newProgram, duration: Number(e.target.value) })}
                    />
                    <div className="flex gap-4">
                        <button
                            className="bg-purple-600 text-white px-4 py-2 rounded"
                            onClick={async () => {
                                if (!newProgram.name || !newProgram.duration) {
                                    return alert('All fields are required.');
                                }

                                const { error } = await supabase.from('programs').insert({
                                    name: newProgram.name,
                                    duration: newProgram.duration,
                                });

                                if (error) {
                                    alert('Failed to create program.');
                                } else {
                                    alert('Program created!');
                                    setShowAddProgramForm(false);
                                    setNewProgram({ name: '', duration: 4 });
                                    window.location.reload(); // or re-fetch
                                }
                            }}
                        >
                            Save Program
                        </button>
                        <button
                            className="bg-gray-500 text-white px-4 py-2 rounded"
                            onClick={() => setShowAddProgramForm(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}




            {showAddForm && (
                <div className="border p-4 mb-6 bg-gray-700 rounded">
                    <h2 className="text-lg font-bold mb-2">Add Athlete</h2>
                    <input
                        className="border p-2 mb-2 w-full"
                        placeholder="First Name"
                        value={newAthlete.first_name}
                        onChange={(e) => setNewAthlete({ ...newAthlete, first_name: e.target.value })}
                    />
                    <input
                        className="border p-2 mb-2 w-full"
                        placeholder="Last Name"
                        value={newAthlete.last_name}
                        onChange={(e) => setNewAthlete({ ...newAthlete, last_name: e.target.value })}
                    />
                    <input
                        className="border p-2 mb-2 w-full"
                        placeholder="Email"
                        value={newAthlete.email}
                        onChange={(e) => setNewAthlete({ ...newAthlete, email: e.target.value })}
                    />
                    <select
                        className="w-full p-2 border rounded mb-4"
                        value={newAthlete.program_id}
                        onChange={(e) => setNewAthlete({ ...newAthlete, program_id: e.target.value })}
                    >
                        <option value="">-- Choose Program --</option>
                        {programs.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.duration} weeks)</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        className="w-full p-2 border rounded mb-4"
                        value={newAthlete.assigned_date}
                        onChange={(e) => setNewAthlete({ ...newAthlete, assigned_date: e.target.value })}
                    />
                    <div className="flex gap-4">
                        <button
                            className="bg-blue-600 text-white px-4 py-2 rounded"
                            onClick={async () => {
                                if (!newAthlete.program_id) return alert('Please select a program')
                                const { error } = await supabase.from('athletes').insert({
                                    first_name: newAthlete.first_name,
                                    last_name: newAthlete.last_name,
                                    email: newAthlete.email,
                                    program_id: newAthlete.program_id,
                                    assigned_date: newAthlete.assigned_date,
                                    current_week: 1
                                })
                                if (error) alert('Error adding athlete')
                                else {
                                    setShowAddForm(false)
                                    setNewAthlete({ first_name: '', last_name: '', email: '', program_id: '', assigned_date: new Date().toISOString().split('T')[0] })
                                    window.location.reload()
                                }
                            }}
                        >
                            Save
                        </button>
                        <button
                            className="bg-gray-500 text-white px-4 py-2 rounded"
                            onClick={() => setShowAddForm(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>

            )}

            <div className="flex justify-between items-center mb-4">
                <button
                    className="bg-green-600 text-white px-4 py-2 rounded"
                    onClick={() => setShowAddForm(true)}
                >
                    + Add Athlete
                </button>

                <button
                    className="bg-purple-600 text-white px-4 py-2 rounded"
                    onClick={() => setShowAddProgramForm(true)}
                >
                    + Create New Program
                </button>

                <button
                    className={`px-4 py-2 rounded ${
                        selectedAthletes.size > 0 ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white cursor-not-allowed'
                    }`}
                    onClick={() => {
                        if (selectedAthletes.size > 0) setAssignMode(true)
                    }}
                    disabled={selectedAthletes.size === 0}
                >
                    Assign Programming
                </button>
            </div>

            <table className="w-full table-auto border text-sm">
                <thead className="bg-red-600 text-white">
                <tr>
                    <th className="border px-4 py-2 text-left w-40">
                        Select All
                        <input
                            type="checkbox"
                            className="ml-2"
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectedAthletes(new Set(athletes.map((a) => a.id)))
                                } else {
                                    setSelectedAthletes(new Set())
                                }
                            }}
                        />
                    </th>
                    <th className="border px-2 py-2 text-center cursor-pointer" onClick={() => toggleSort('first_name')}>First Name</th>
                    <th className="border px-2 py-2 text-center cursor-pointer" onClick={() => toggleSort('last_name')}>Last Name</th>
                    <th className="border px-2 py-2 text-center cursor-pointer" onClick={() => toggleSort('email')}>Email</th>
                    <th className="border px-2 py-2 text-center">Program</th>
                    <th className="border px-2 py-2 text-center cursor-pointer" onClick={() => toggleSort('assigned_date')}>Assigned Date</th>
                    <th className="border px-2 py-2 text-center">Duration (Weeks) </th>
                    <th className="border px-2 py-2 text-center">Expected Week</th>
                    <th className="border px-2 py-2 text-center">Actual Week</th>
                </tr>
                </thead>
                <tbody>
                {sortedAthletes.map((athlete) => (
                    <tr key={athlete.id} className={isEndingSoon(athlete) ? 'bg-yellow-400 text-red-950' : ''}>
                        <td className="border px-2 py-1 text-left" style={{ width: '1%', whiteSpace: 'nowrap' }}>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedAthletes.has(athlete.id)}
                                    onChange={() => {
                                        setSelectedAthletes((prev) => {
                                            const copy = new Set(prev)
                                            if (copy.has(athlete.id)) copy.delete(athlete.id)
                                            else copy.add(athlete.id)
                                            return copy
                                        })
                                    }}
                                    className="h-4 w-4" // helps size the checkbox appropriately
                                />
                                <button
                                    className="text-blue-600"
                                    onClick={() => {
                                        setEditMode(athlete.id)
                                        setEditFirstName(athlete.first_name)
                                        setEditLastName(athlete.last_name)
                                        setEditEmail(athlete.email)
                                        setSelectedProgramId(programs.find(p => p.name === athlete.program?.name)?.id || '')
                                        setEditAssignDate(athlete.assigned_date)
                                        setEditCurrentWeek(athlete.current_week)
                                    }}
                                    title="Edit athlete"
                                >
                                    ✏️
                                </button>
                                <button
                                    className="text-red-600"
                                    onClick={async () => {
                                        const confirmed = window.confirm(`Are you sure you want to delete ${athlete.first_name} ${athlete.last_name}?`)
                                        if (!confirmed) return
                                        const { error } = await supabase.from('athletes').delete().eq('id', athlete.id)
                                        if (error) {
                                            alert('Failed to delete athlete.')
                                            console.error(error)
                                        } else {
                                            setAthletes(prev => prev.filter(a => a.id !== athlete.id))
                                        }
                                    }}
                                    title="Delete athlete"
                                >
                                    🗑️
                                </button>
                            </div>
                        </td>

                        <td className="border text-center px-2 py-1">{athlete.first_name}</td>
                        <td className="border text-center px-2 py-1">{athlete.last_name}</td>
                        <td className="border text-left px-2 py-1">{athlete.email}</td>
                        <td className="border text-left px-2 py-1">{athlete.program?.name}</td>
                        <td className="border text-center px-2 py-1">{athlete.assigned_date}</td>
                        <td className="border text-center px-2 py-1">{athlete.program?.duration}</td>

                        <td className="border text-center px-2 py-1">
                            {athlete.program
                                ? calculateExpectedWeek(athlete.assigned_date, athlete.program.duration)
                                : '-'}
                        </td>
                        <td className="border text-center px-2 py-1">{athlete.current_week}</td>
                    </tr>
                ))}
                </tbody>
            </table>

            {/* Programs Table */}
            <h2 className="text-2xl font-semibold mt-12 mb-4">Programs</h2>
            <table className="w-full table-auto border text-sm">
                <thead className="bg-orange-700 text-white">
                <tr>
                    <th className="border px-4 py-2 text-left w-40">Actions</th>
                    <th className="border px-2 py-2 text-center">Program Name</th>
                    <th className="border px-2 py-2 text-center">Duration (weeks)</th>
                </tr>
                </thead>
                <tbody>
                {programs.map((program) => (
                    <tr key={program.id}>
                        <td className="border px-2 py-1 text-left" style={{ width: '1%', whiteSpace: 'nowrap' }}>
                            <div className="flex items-center gap-2">
                                <button
                                    className="text-blue-600"
                                    onClick={() => {
                                        setEditProgramId(program.id);
                                        setEditProgramName(program.name);
                                        setEditProgramDuration(program.duration);
                                    }}
                                    title="Edit program"
                                >
                                    ✏️
                                </button>
                                <button
                                    className="text-red-600"
                                    onClick={async () => {
                                        const confirmed = window.confirm(`Delete program "${program.name}"?`);
                                        if (!confirmed) return;
                                        const { error } = await supabase.from('programs').delete().eq('id', program.id);
                                        if (!error) {
                                            setPrograms(programs.filter((p) => p.id !== program.id));
                                        }
                                    }}
                                    title="Delete program"
                                >
                                    🗑️
                                </button>
                            </div>
                        </td>
                        <td className="border text-center px-2 py-1">{program.name}</td>
                        <td className="border text-center px-2 py-1">{program.duration}</td>
                    </tr>
                ))}
                </tbody>
            </table>

            {/* Edit Program Form */}
            {editProgramId && (
                <div className="border p-4 my-6 bg-purple-950 rounded">
                    <h2 className="text-lg font-bold mb-2">Edit Program</h2>
                    <input
                        className="border p-2 bg-white text-black mb-2 w-full"
                        placeholder="Program Name"
                        value={editProgramName}
                        onChange={(e) => setEditProgramName(e.target.value)}
                    />
                    <input
                        type="number"
                        className="border p-2 bg-white text-black mb-4 w-full"
                        placeholder="Duration (in weeks)"
                        value={editProgramDuration}
                        onChange={(e) => setEditProgramDuration(Number(e.target.value))}
                    />
                    <div className="flex gap-4">
                        <button
                            className="bg-green-600 text-white px-4 py-2 rounded"
                            onClick={async () => {
                                const { error } = await supabase
                                    .from('programs')
                                    .update({
                                        name: editProgramName,
                                        duration: editProgramDuration,
                                    })
                                    .eq('id', editProgramId);

                                if (!error) {
                                    setPrograms(programs.map(p =>
                                        p.id === editProgramId
                                            ? { ...p, name: editProgramName, duration: editProgramDuration }
                                            : p
                                    ));
                                    setEditProgramId(null);
                                } else {
                                    alert('Failed to update program.');
                                }
                            }}
                        >
                            Save Changes
                        </button>
                        <button
                            className="bg-gray-500 text-white px-4 py-2 rounded"
                            onClick={() => setEditProgramId(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}


            {/*Edit mode*/}

            {editMode && (
                <div className="border p-4 my-6 bg-blue-950 rounded">
                    <h2 className="text-lg font-bold mb-2">Update Athlete</h2>
                    <input
                        className="border p-2 bg-white text-black mb-2 w-full"
                        placeholder="First Name"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                    />
                    <input
                        className="border p-2 mb-2 bg-white text-black w-full"
                        placeholder="Last Name"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                    />
                    <input
                        className="border p-2 mb-2 bg-white text-black w-full"
                        placeholder="Email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                    />
                    <label className="block mb-1 font-medium">Current Week:</label>
                    <select
                        className="border p-2 mb-2 bg-white text-black w-full"
                        value={editCurrentWeek}
                        onChange={(e) => {
                            const selectedWeek = Number(e.target.value)
                            const maxWeek = programs.find(p => p.id === selectedProgramId)?.duration || 0

                            if (selectedWeek > maxWeek) {
                                alert(`Current week cannot exceed the program's duration of ${maxWeek} weeks.`)
                                return
                            }

                            setEditCurrentWeek(selectedWeek)
                        }}
                    >
                        {[...Array(12)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                                Week {i + 1}
                            </option>
                        ))}
                    </select>




                    <select
                        className="w-full p-2 border bg-white text-black rounded mb-4"
                        value={selectedProgramId || ''}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                    >
                        <option value="">-- Choose a program --</option>
                        {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                                {program.name} ({program.duration} weeks)
                            </option>
                        ))}
                    </select>
                    <input
                        type="date"
                        className="w-full p-2 border bg-white text-black rounded mb-4"
                        value={editAssignDate}
                        onChange={(e) => setEditAssignDate(e.target.value)}
                    />


                    <div className="flex gap-4">
                        <button
                            className="bg-green-600 text-white px-4 py-2 rounded"
                            onClick={async () => {
                                const id = editMode
                                await supabase.from('athletes').update({
                                    first_name: editFirstName,
                                    last_name: editLastName,
                                    email: editEmail,
                                    program_id: selectedProgramId,
                                    assigned_date: editAssignDate,
                                    current_week: editCurrentWeek
                                }).eq('id', id)

                                setEditMode(null)
                                window.location.reload()
                            }}
                        >
                            Save Changes
                        </button>
                        <button
                            className="bg-gray-500 text-white px-4 py-2 rounded"
                            onClick={() => setEditMode(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}


            {/*assign programming mode */}




            {assignMode && (
                <div className="mt-6 border-t pt-4">
                    <h2 className="text-xl font-semibold mb-2">Assign Programming</h2>

                    <label className="block mb-1">Select Program:</label>
                    <select
                        className="w-full p-2 border rounded mb-4"
                        value={selectedProgramId || ''}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                    >
                        <option value="">-- Choose a program --</option>
                        {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                                {program.name} ({program.duration} weeks)
                            </option>
                        ))}
                    </select>

                    <label className="block mb-1">Start Date:</label>
                    <input
                        type="date"
                        className="w-full p-2 border rounded mb-4"
                        value={bulkAssignDate}
                        onChange={(e) => setBulkAssignDate(e.target.value)}
                    />



                    <div className="flex gap-4">
                        <button
                            className="px-4 py-2 bg-green-600 text-white rounded"
                            onClick={async () => {
                                if (!selectedProgramId) return alert('Please select a program')

                                const updates = Array.from(selectedAthletes).map((athleteId) =>
                                    supabase.from('athletes').update({
                                        program_id: selectedProgramId,
                                        assigned_date: bulkAssignDate,
                                        current_week: 1,
                                    }).eq('id', athleteId)
                                )

                                await Promise.all(updates)
                                alert('Programming assigned!')
                                setAssignMode(false)
                                setSelectedAthletes(new Set())
                                window.location.reload()
                            }}
                        >
                            Assign
                        </button>
                        <button
                            className="px-4 py-2 bg-gray-500 text-white rounded"
                            onClick={() => setAssignMode(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/*add new programming*/}


        </div>
    )
}
