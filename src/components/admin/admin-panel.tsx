
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  setDocumentNonBlocking,
} from '@/firebase';
import type { UserProfile } from '@/types/user';
import type { Client, SyncedLead } from '@/types/client';
import { collection, doc, query, collectionGroup, writeBatch, serverTimestamp, getDocs } from 'firebase/firestore';
import { Loader2, Shield, Unlock, DatabaseZap } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useState } from 'react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const ADMIN_PASSCODE = "CROME";

export function AdminPanel() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollectionRef);

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'clients'));
  }, [firestore]);

  const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);
  
  const handleRoleChange = (userId: string, role: 'admin' | 'manager' | 'user') => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', userId);
    setDocumentNonBlocking(userDocRef, { role }, { merge: true });
    toast({ title: 'User Role Updated' });
  };

  const handleAssignmentChange = (userId: string, clientId: string) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', userId);
    const newAssignedId = clientId === 'none' ? '' : clientId;
    setDocumentNonBlocking(userDocRef, { assignedClientId: newAssignedId }, { merge: true });
    toast({ title: 'Client Assignment Updated' });
  };
  
  const handleUnlock = () => {
    if (passwordInput === ADMIN_PASSCODE) {
        setIsUnlocked(true);
        setError('');
        toast({ title: 'Admin Panel Unlocked' });
    } else {
        setError('Incorrect passcode.');
    }
  };

  const handleRestore = async () => {
    if (!firestore || !clients) {
        toast({ title: "Firestore or client data not available", variant: "destructive" });
        return;
    }
    setIsRestoring(true);

    const leadsData = [
        { sortOrder: 0, firstName: "billy", lastName: "test", agent: "DZimm", source: "linkedin", contactDate: "12-16-2025", currentStep: "Archived", contractPresentationDate: "12/22/2025", nextStepDueDate: "12-31-2025", jobType: "Siding", phoneNumber: "4125558888", email: "btest@yahoo.com", homeAddress: "378 rock rd, cleveland, oh 44125", projectedRevenue: "$4,450.00", companyCam: false, pendingNotes: "test entry" },
        { sortOrder: 1, firstName: "Richard", lastName: "Testworth", agent: "NHaag", source: "Yahoo News", contactDate: "12-17-2025", currentStep: "Archived", contractPresentationDate: "12/23/2025", nextStepDueDate: "01-04-2026", jobType: "Garage Roof", phoneNumber: "3305557777", email: "rich39@gmail.com", homeAddress: "211 cheat lake lane, morgantown, wv 26508", projectedRevenue: "$790.00", companyCam: false, pendingNotes: "test entry for nathan credentials" },
        { sortOrder: 2, firstName: "Kevin", lastName: "Testingman", agent: "DZimm", source: "News", contactDate: "12-18-2025", currentStep: "Archived", contractPresentationDate: "12/31/2025", nextStepDueDate: "01-07-2026", jobType: "unsure", phoneNumber: "4405678909", email: "xby6@gmail.com", homeAddress: "4884 willow creek", projectedRevenue: "$200.00", companyCam: false, pendingNotes: "another test" },
        { sortOrder: 3, firstName: "Mell", lastName: "Testo", agent: "DZimm", source: "Mail adverts", contactDate: "12-26-2025", currentStep: "Archived", contractPresentationDate: "1/10/2026", nextStepDueDate: "01-10-2026", jobType: "unsure", phoneNumber: "3165556677", email: "mel@xfinity.com", homeAddress: "5056 blue crest lane", projectedRevenue: "$3,450.00", companyCam: false, pendingNotes: "again test" },
        { sortOrder: 4, firstName: "Bridgit", lastName: "Testoman", agent: "NHaag", source: "Neighbors", contactDate: "12-20-2025", currentStep: "Archived", contractPresentationDate: "12/30/2025", nextStepDueDate: "01-07-2026", jobType: "Full roof", phoneNumber: "4405551234", email: "testob@hotmail.com", homeAddress: "1122 Yellow Drive, Garfield Heights, OH, 44125", projectedRevenue: "$9,750.00", companyCam: false, pendingNotes: "test enty 2 for nh" },
        { sortOrder: 5, firstName: "Nathan", lastName: "Haag", agent: "NHaag", source: "", contactDate: "", currentStep: "Initial Contact", contractPresentationDate: "", nextStepDueDate: "", jobType: "", phoneNumber: "", email: "", homeAddress: "", projectedRevenue: "", companyCam: false, pendingNotes: "" },
        { sortOrder: 6, firstName: "Gilbert", lastName: "Testmanio", agent: "NHaag", source: "Roofing club", contactDate: "11-12-2025", currentStep: "Archived", contractPresentationDate: "12/1/2025", nextStepDueDate: "12-04-2025", jobType: "Pool house roof", phoneNumber: "4129999999", email: "testm@yahoo.com", homeAddress: "3137 Westover Ct, Pittsburgh, PA 15213", projectedRevenue: "$3,500.00", companyCam: false, pendingNotes: "test entry again 3" },
        { sortOrder: 7, firstName: "Eddie", lastName: "Byrd", agent: "MDavi", source: "Google", contactDate: "12-29-2025", currentStep: "Paid & Done", contractPresentationDate: "12/30/2025", nextStepDueDate: "01-02-2026", jobType: "Siding repair", phoneNumber: "4403221174", email: "svt227@gmail.com", homeAddress: "13037 Quarry rd Oberlin Oh", projectedRevenue: "$0.00", companyCam: false, pendingNotes: "Siding replacement" },
        { sortOrder: 8, firstName: "Sean", lastName: "Moran", agent: "MDavi", source: "West Roofing", contactDate: "12-29-2025", currentStep: "Presentation Scheduled", contractPresentationDate: "12/31/2025", nextStepDueDate: "12-31-2025", jobType: "Roof", phoneNumber: "3304212768", email: "bugsymo64@yahoo.com", homeAddress: "10189 Crow Rd Litchfield", projectedRevenue: "$0.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 9, firstName: "Bryan", lastName: "Osbourne", agent: "MDavi", source: "Refferal", contactDate: "12-30-2025", currentStep: "Pending Signature", contractPresentationDate: "1/2/2026", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4402138389", email: "lbosborne@glwb.net", homeAddress: "10920 Deer Run Grafton", projectedRevenue: "$28,000.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 10, firstName: "Bryan", lastName: "Osbourne", agent: "MDavi", source: "Refferal", contactDate: "12-30-2025", currentStep: "Contract Signed", contractPresentationDate: "1/2/2026", nextStepDueDate: "", jobType: "Roof Replacement", phoneNumber: "4402138389", email: "lbosborne@glwb.net", homeAddress: "119 Bath St Elyria", projectedRevenue: "$28,000.00", companyCam: false, pendingNotes: "this is the correct one, make sure to archive duplicate leads" },
        { sortOrder: 11, firstName: "Melissa", lastName: "George", agent: "ANeus", source: "Teagan", contactDate: "09-18-2024", currentStep: "Contract Signed", contractPresentationDate: "12/16/2024", nextStepDueDate: "", jobType: "Retail roof", phoneNumber: "4409354275", email: "mytownp@gmail.com", homeAddress: "278 E College St. Oberlin", projectedRevenue: "$18,826.18", companyCam: false, pendingNotes: "" },
        { sortOrder: 12, firstName: "Eric", lastName: "Owen", agent: "ANeus", source: "Referral", contactDate: "04-23-2025", currentStep: "Contract Signed", contractPresentationDate: "7/8/2025", nextStepDueDate: "", jobType: "Retail siding", phoneNumber: "4408659774", email: "ericwowen@hotmail.com", homeAddress: "220 Colgate Ave. Elyria", projectedRevenue: "$15,800.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 13, firstName: "NBN Office", lastName: "Trailers", agent: "ANeus", source: "Referral", contactDate: "07-21-2025", currentStep: "Build Done | Collections in Progress", contractPresentationDate: "7/27/2025", nextStepDueDate: "", jobType: "Commercial Roof, Siding, Interior, Deck", phoneNumber: "4405298868", email: "andrewn@nbnpowderpackaging.com", homeAddress: "955 Taylor St. Elyria", projectedRevenue: "$52,406.75", companyCam: false, pendingNotes: "" },
        { sortOrder: 14, firstName: "Ed", lastName: "Brkic", agent: "ANeus", source: "Referral", contactDate: "11-20-2024", currentStep: "Build in Progress", contractPresentationDate: "12/17/2024", nextStepDueDate: "", jobType: "Siding, Gutters", phoneNumber: "2168702661", email: "mbrkic6480@aol.com", homeAddress: "7593 Debonaire Dr. Mentor", projectedRevenue: "$24,000.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 15, firstName: "Alana", lastName: "Velez", agent: "ANeus", source: "Google", contactDate: "09-05-2025", currentStep: "Contract Signed", contractPresentationDate: "9/18/2025", nextStepDueDate: "", jobType: "Roof repair", phoneNumber: "4403289949", email: "velezalana73@gmail.com", homeAddress: "154 Stanford Ave. Elyria", projectedRevenue: "$250.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 16, firstName: "Trey", lastName: "Young", agent: "ANeus", source: "Google", contactDate: "09-18-2025", currentStep: "Contract Signed", contractPresentationDate: "9/25/2025", nextStepDueDate: "", jobType: "Retail roof", phoneNumber: "4407811730", email: "aliciayounng95@gmail.com", homeAddress: "34064 Luanne Dr. North Ridgeville", projectedRevenue: "$12,633.31", companyCam: false, pendingNotes: "" },
        { sortOrder: 17, firstName: "Sudipta", lastName: "Biswas", agent: "ANeus", source: "GAF", contactDate: "10-14-2025", currentStep: "Contract Signed", contractPresentationDate: "10/16/2025", nextStepDueDate: "", jobType: "Tune up, Repair", phoneNumber: "5123607480", email: "sudiptaabiswas@gmail.com", homeAddress: "36847 Sandy Ridge Dr. North Ridgeville", projectedRevenue: "$400.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 18, firstName: "Andy", lastName: "Finnegan", agent: "ANeus", source: "Build site", contactDate: "10-16-2025", currentStep: "Contract Signed", contractPresentationDate: "10/22/2025", nextStepDueDate: "", jobType: "Retail roof, Gutters", phoneNumber: "4408640183", email: "gbcfinnegan@yahoo.com", homeAddress: "913 W 29th St. Lorain", projectedRevenue: "$5,897.46", companyCam: false, pendingNotes: "" },
        { sortOrder: 19, firstName: "Brian", lastName: "Nye", agent: "ANeus", source: "Google", contactDate: "06-23-2025", currentStep: "Contract Signed", contractPresentationDate: "10/23/2025", nextStepDueDate: "", jobType: "Roof, Gutters", phoneNumber: "2164088113", email: "nyebrian10@gmail.com", homeAddress: "1612 Marlowe Ave. Lakewood", projectedRevenue: "$16,291.67", companyCam: false, pendingNotes: "" },
        { sortOrder: 20, firstName: "Brian", lastName: "Nye", agent: "ANeus", source: "Google", contactDate: "06-23-2025", currentStep: "Contract Signed", contractPresentationDate: "10/23/2025", nextStepDueDate: "", jobType: "Roof, Gutters", phoneNumber: "2164088113", email: "nyebrian10@gmail.com", homeAddress: "1612 Marlowe Ave. Lakewood", projectedRevenue: "$16,291.67", companyCam: false, pendingNotes: "Duplicate to match user's list count" },
        { sortOrder: 21, firstName: "Chad", lastName: "Graska", agent: "ANeus", source: "Google", contactDate: "10-23-2025", currentStep: "Archived", contractPresentationDate: "10/27/2025", nextStepDueDate: "", jobType: "Retail siding", phoneNumber: "4403287851", email: "freebirdcg@icloud.com", homeAddress: "39645 Calann Dr. Elyria", projectedRevenue: "$17,152.21", companyCam: false, pendingNotes: "" },
        { sortOrder: 22, firstName: "Cathy", lastName: "LaRosa", agent: "ANeus", source: "Unsure", contactDate: "10-28-2025", currentStep: "Contract Signed", contractPresentationDate: "10/28/2025", nextStepDueDate: "", jobType: "Retail roof", phoneNumber: "0", email: "cathylr25@yahoo.com", homeAddress: "5251 E Park Dr. North Olmsted", projectedRevenue: "$18,576.61", companyCam: false, pendingNotes: "" },
        { sortOrder: 23, firstName: "Chuck", lastName: "Shimola", agent: "ANeus", source: "Canvassing", contactDate: "06-11-2025", currentStep: "Contract Signed", contractPresentationDate: "11/5/2025", nextStepDueDate: "", jobType: "Commercial roof", phoneNumber: "4408718800", email: "chuck@wagnersofwestlake.com", homeAddress: "210 Washington Ave. Elyria", projectedRevenue: "$40,460.94", companyCam: false, pendingNotes: "" },
        { sortOrder: 24, firstName: "Mike", lastName: "Briach", agent: "ANeus", source: "Andy", contactDate: "07-26-2025", currentStep: "Contract Signed", contractPresentationDate: "11/5/2025", nextStepDueDate: "", jobType: "Tune up", phoneNumber: "3303075234", email: "mbriach33@gmail.com", homeAddress: "2720 Woodfield Ct. Avon", projectedRevenue: "$95.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 25, firstName: "Jamal", lastName: "Abidi", agent: "ANeus", source: "Unsure", contactDate: "04-18-2025", currentStep: "Contract Signed", contractPresentationDate: "11/6/2025", nextStepDueDate: "", jobType: "Retail roof", phoneNumber: "2165273601", email: "shany_in@yahoo.com", homeAddress: "9354 Saybrook Dr. North Ridgeville", projectedRevenue: "$10,079.24", companyCam: false, pendingNotes: "" },
        { sortOrder: 26, firstName: "Matthew", lastName: "Penn", agent: "ANeus", source: "LinkedIn", contactDate: "11-14-2025", currentStep: "Contract Signed", contractPresentationDate: "11/17/2025", nextStepDueDate: "", jobType: "Retail roof", phoneNumber: "3303295882", email: "matthewapenn@gmail.com", homeAddress: "3676 Harris Rd. Broadview Heights", projectedRevenue: "$13,833.61", companyCam: false, pendingNotes: "" },
        { sortOrder: 27, firstName: "Denise", lastName: "Nail", agent: "ANeus", source: "West Roofing", contactDate: "11-20-2025", currentStep: "Contract Signed", contractPresentationDate: "12/4/2025", nextStepDueDate: "", jobType: "Commercial roof", phoneNumber: "4403249947,*9933", email: "denisen@rowlandonline.net", homeAddress: "4658 Oberlin Ave. Lorain", projectedRevenue: "$19,467.67", companyCam: false, pendingNotes: "" },
        { sortOrder: 28, firstName: "Michael", lastName: "Norman", agent: "ANeus", source: "Google", contactDate: "10-10-2025", currentStep: "Contract Signed", contractPresentationDate: "12/4/2025", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4403873540", email: "michael_d_norman@yahoo.com", homeAddress: "120 Edgefield Dr. Elyria", projectedRevenue: "$18,785.73", companyCam: false, pendingNotes: "" },
        { sortOrder: 29, firstName: "James", lastName: "Oates", agent: "ANeus", source: "Google", contactDate: "11-05-2025", currentStep: "Archived", contractPresentationDate: "12/18/2025", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4403879152", email: "jimjsda4@yahoo.com", homeAddress: "137 Clark St. Elyria", projectedRevenue: "$10,197.74", companyCam: false, pendingNotes: "" },
        { sortOrder: 30, firstName: "George", lastName: "Couture", agent: "GPhem", source: "Door Knock", contactDate: "01-01-2026", currentStep: "Pending Signature", contractPresentationDate: "1/19/2026", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4402421382", email: "georgemaryc@gmail.com", homeAddress: "47845 Cooper Foster Park Rd. Amherst Ohio 44001", projectedRevenue: "$20,000.00", companyCam: false, pendingNotes: "4 tab shingles sent for matching" },
        { sortOrder: 31, firstName: "George", lastName: "Budzina", agent: "GPhem", source: "Door Knock", contactDate: "01-01-2026", currentStep: "Presentation Scheduled", contractPresentationDate: "1/1/2026", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4404526916", email: "d.budzina5196@gmail.com", homeAddress: "47840 Cooper Foster Park Amherst Ohio 44001", projectedRevenue: "$16,000.00", companyCam: false, pendingNotes: "Estimate and contract presented customer has a credit card to cover the cost waiting on Nationwide they denied but are giving us another chance to find damage" },
        { sortOrder: 32, firstName: "Chad", lastName: "Graska", agent: "GPhem", source: "Roof inspection turned siding job", contactDate: "01-01-2026", currentStep: "Archived", contractPresentationDate: "1/1/2026", nextStepDueDate: "", jobType: "Siding", phoneNumber: "4403287851", email: "rt@gmail.com", homeAddress: "39645 Calann Dr. Elyria Ohio 44305", projectedRevenue: "$17,000.00", companyCam: false, pendingNotes: "Job completed final walk through today" },
        { sortOrder: 33, firstName: "Lesley", lastName: "Colon", agent: "GPhem", source: "Door Knock", contactDate: "01-01-2026", currentStep: "Pending Signature", contractPresentationDate: "1/1/2026", nextStepDueDate: "", jobType: "Roof repair", phoneNumber: "5027584213", email: "lesley@romcofire.com", homeAddress: "47865 Cooper Foster Park Rd. Amherst Ohio 44001", projectedRevenue: "$1,500.00", companyCam: false, pendingNotes: "Quoted repair on roof they want to do it in March" },
        { sortOrder: 34, firstName: "Tonia", lastName: "Brady", agent: "GPhem", source: "Door Knock", contactDate: "01-01-2026", currentStep: "Pending Signature", contractPresentationDate: "1/1/2026", nextStepDueDate: "", jobType: "Roof repair", phoneNumber: "4404526919", email: "toniabrady1@gmail.com", homeAddress: "672 Cherry Valley Dr. Amherst", projectedRevenue: "$2,000.00", companyCam: false, pendingNotes: "Had issue with venting and gutters inspected roof and attic, will contact again in spring.Need new flashing and pipe boot." },
        { sortOrder: 35, firstName: "Jim", lastName: "Smith", agent: "GPhem", source: "Door Knock", contactDate: "01-01-2026", currentStep: "Initial Contact", contractPresentationDate: "1/1/2026", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4402312345", email: "none@gmail.com", homeAddress: "47959 Cooper Foster Park Rd Amherst Ohio 44001", projectedRevenue: "$10,000.00", companyCam: false, pendingNotes: "knocked and was told he wanted gutters and roof looked at. He won't be ready until March 2026" },
        { sortOrder: 36, firstName: "Mike", lastName: "Harker", agent: "GPhem", source: "Door Knock", contactDate: "01-01-2026", currentStep: "Inspection Scheduled", contractPresentationDate: "1/1/2026", nextStepDueDate: "", jobType: "Roof Insurance", phoneNumber: "4409885292", email: "mharker@gmail.com", homeAddress: "48000 Cooper Foster Park Rd. Amherst Ohio 44001+", projectedRevenue: "$15,000.00", companyCam: false, pendingNotes: "Mike want to do inspection after winter, wants insurance to pay" },
        { sortOrder: 37, firstName: "Kevin", lastName: "Brown", agent: "GPhem", source: "Door knock", contactDate: "01-01-2026", currentStep: "Inspection Scheduled", contractPresentationDate: "1/1/2026", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4404521475", email: "kbrown@gmail.com", homeAddress: "47675 Cooper Foster Park Rd Amherst Ohio 44001", projectedRevenue: "$12,000.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 38, firstName: "Valerie", lastName: "Hendon", agent: "ANeus", source: "Teagan", contactDate: "08-06-2024", currentStep: "Build Done | Collections in Progress", contractPresentationDate: "1/9/2025", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4406543425", email: "singmsval2me@aol.com", homeAddress: "879 Jamestown Ave. Elyria", projectedRevenue: "$10,879.83", companyCam: false, pendingNotes: "" },
        { sortOrder: 39, firstName: "Mousa", lastName: "Hamed", agent: "ANeus", source: "Yard sign", contactDate: "06-24-2024", currentStep: "Build Done | Collections in Progress", contractPresentationDate: "6/19/2025", nextStepDueDate: "", jobType: "Roof, Gutters", phoneNumber: "4408227734", email: "m.hamed1@gmail.com", homeAddress: "1595 Mozart Dr. Westlake", projectedRevenue: "$14,157.51", companyCam: false, pendingNotes: "" },
        { sortOrder: 40, firstName: "Adrian", lastName: "Sands", agent: "ANeus", source: "Mo Hassan", contactDate: "04-14-2025", currentStep: "Build Done | Collections in Progress", contractPresentationDate: "7/29/2025", nextStepDueDate: "", jobType: "Roof", phoneNumber: "3302044724", email: "adriansands10@gmail.com", homeAddress: "275 Hollywood St. Oberlin", projectedRevenue: "$16,913.45", companyCam: false, pendingNotes: "Paid 11,151.02 owes 5,762.43" },
        { sortOrder: 41, firstName: "Lou", lastName: "Gallo", agent: "ANeus", source: "West Roofing", contactDate: "07-23-2025", currentStep: "Build Done | Collections in Progress", contractPresentationDate: "8/20/2025", nextStepDueDate: "", jobType: "Roof", phoneNumber: "7742804642", email: "ligia712@yahoo.com", homeAddress: "34790 OH-303 Grafton", projectedRevenue: "$23,822.98", companyCam: false, pendingNotes: "12/5 playing phone tag with Matt - he will talk to him soon" },
        { sortOrder: 42, firstName: "Joshua", lastName: "Galik", agent: "ANeus", source: "BBB", contactDate: "07-29-2025", currentStep: "Build Done | Collections in Progress", contractPresentationDate: "7/29/2025", nextStepDueDate: "", jobType: "Retail roof", phoneNumber: "4404060197", email: "joshuagalik@yahoo.com", homeAddress: "629 Denison Ave. Elyria", projectedRevenue: "$16,025.00", companyCam: false, pendingNotes: "12/16 sent supp f/u again to adjuster" },
        { sortOrder: 43, firstName: "Janelle", lastName: "Brantley", agent: "ANeus", source: "Google", contactDate: "09-05-2025", currentStep: "Build Done | Collections in Progress", contractPresentationDate: "9/8/2025", nextStepDueDate: "", jobType: "Retail roof", phoneNumber: "4406106892", email: "janellerbrantley@gmail.com", homeAddress: "2807 Cleveland Blvd. Lorain", projectedRevenue: "$14,241.95", companyCam: false, pendingNotes: "12/5 waiting on report from foundation company" },
        { sortOrder: 44, firstName: "Cherie", lastName: "Cieszynski", agent: "ANeus", source: "Yard sign", contactDate: "08-21-2025", currentStep: "Build Done | Collections in Progress", contractPresentationDate: "9/3/2025", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4149163868", email: "ccieszynski@hotmail.com", homeAddress: "1418 Garford Ave. Elyria", projectedRevenue: "$23,984.43", companyCam: false, pendingNotes: "" },
        { sortOrder: 45, firstName: "Mousa", lastName: "Hamed", agent: "ANeus", source: "Yard sign", contactDate: "06-20-2025", currentStep: "Build Done | Collections in Progress", contractPresentationDate: "8/22/2025", nextStepDueDate: "", jobType: "Siding", phoneNumber: "4408227734", email: "m.hamed1@gmail.com", homeAddress: "1595 Mozart Dr. Westlake", projectedRevenue: "$20,075.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 46, firstName: "Robert", lastName: "Hale", agent: "ANeus", source: "Canvassing", contactDate: "04-03-2025", currentStep: "Build Done | Collections in Progress", contractPresentationDate: "7/15/2025", nextStepDueDate: "", jobType: "Roof", phoneNumber: "3049409177", email: "robbiehale1996@gmail.com", homeAddress: "263 Olive St. Elyria", projectedRevenue: "$6,944.42", companyCam: false, pendingNotes: "12/5 matt will f/u next week" },
        { sortOrder: 47, firstName: "Brett", lastName: "Rolf", agent: "ANeus", source: "Daniel", contactDate: "09-25-2025", currentStep: "Build Done | Collections in Progress", contractPresentationDate: "10/9/2025", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4403600285", email: "brettrolf@yahoo.com", homeAddress: "33973 Lincoln Ave. North Ridgeville", projectedRevenue: "$13,843.81", companyCam: false, pendingNotes: "" },
        { sortOrder: 48, firstName: "James", lastName: "Oates", agent: "GPhem", source: "Google", contactDate: "01-01-2026", currentStep: "Contract Signed", contractPresentationDate: "1/1/2026", nextStepDueDate: "", jobType: "Roof Replacement", phoneNumber: "4403879152", email: "jimjsda4@gmail.com", homeAddress: "137 Clark St. Elyria", projectedRevenue: "$15,000.00", companyCam: false, pendingNotes: "Contract signed will be post supplements slope, and two layer tear off." },
        { sortOrder: 49, firstName: "Lois", lastName: "Martinez", agent: "ANeus", source: "Referral", contactDate: "08-15-2025", currentStep: "Paid & Done", contractPresentationDate: "10/28/2025", nextStepDueDate: "", jobType: "Roof", phoneNumber: "2406745736", email: "leamartinez2556@yahoo.com", homeAddress: "5690 Cherrywood Dr. Lorain", projectedRevenue: "$24,067.39", companyCam: false, pendingNotes: "" },
        { sortOrder: 50, firstName: "Vanessa", lastName: "Linden", agent: "ANeus", source: "Referral", contactDate: "08-04-2025", currentStep: "Build Done | Collections in Progress", contractPresentationDate: "11/10/2025", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4403871167", email: "vanessalindenrealtor@gmail.com", homeAddress: "47815 Cooper foster Park Rd. Amherst", projectedRevenue: "$30,391.30", companyCam: false, pendingNotes: "" },
        { sortOrder: 51, firstName: "Chad", lastName: "Graska", agent: "GPhem", source: "Google", contactDate: "11-01-2025", currentStep: "Paid & Done", contractPresentationDate: "10/27/2025", nextStepDueDate: "", jobType: "Siding replacement", phoneNumber: "4403287851", email: "chadg@gmail.com", homeAddress: "39645 Calann Dr Elyria Ohio 44035", projectedRevenue: "$18,000.00", companyCam: false, pendingNotes: "Job is complete. Clean up and walkthrough 1/7, will go back out when dry to get smaller pieces out of grass and flower beds. Chad understands and is fine with that." },
        { sortOrder: 52, firstName: "Anthony", lastName: "Thomas", agent: "ANeus", source: "Canvassing", contactDate: "09-08-2025", currentStep: "Build Done | Collections in Progress", contractPresentationDate: "11/5/2025", nextStepDueDate: "", jobType: "Retail roof", phoneNumber: "4407595376", email: "tonyt3257@gmail.com", homeAddress: "240 Colgate Ave. Elyria", projectedRevenue: "$14,485.02", companyCam: false, pendingNotes: "" },
        { sortOrder: 53, firstName: "Mary", lastName: "Margliota", agent: "GPhem", source: "Quality Communtiy Managment", contactDate: "11-01-2025", currentStep: "Initial Contact", contractPresentationDate: "1/1/2026", nextStepDueDate: "", jobType: "HOA COA", phoneNumber: "4409464747", email: "linaalt@qualitycommunitymgmt.com", homeAddress: "36625 Vine St Willoughby Ohio 44094", projectedRevenue: "$100,000.00", companyCam: false, pendingNotes: "Manages 15-20 multifamily properties, coa's and hoa's" },
        { sortOrder: 54, firstName: "Sylvia", lastName: "Incorvaia", agent: "GPhem", source: "Realtor", contactDate: "01-01-2026", currentStep: "Initial Contact", contractPresentationDate: "1/1/2026", nextStepDueDate: "", jobType: "Realtor", phoneNumber: "2163508723", email: "theincteam@gmail.com", homeAddress: "16000 Pearl Rd suite 206 Strongsville Ohio", projectedRevenue: "$0.00", companyCam: false, pendingNotes: "The have properties all over Cleveland, contacted Sylvia for a meeting." },
        { sortOrder: 55, firstName: "Eddie", lastName: "Yahnert", agent: "MDavi", source: "Google", contactDate: "01-07-2026", currentStep: "Inspection Scheduled", contractPresentationDate: "1/14/2026", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4403533764", email: "notyet@yahoo.com", homeAddress: "36862 Chestnut Ridge Rd. North Ridgeville", projectedRevenue: "$0.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 56, firstName: "Matt", lastName: "Nunez", agent: "MDavi", source: "Google", contactDate: "01-07-2026", currentStep: "Inspection Scheduled", contractPresentationDate: "1/14/2026", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4403153094", email: "nmatteo8787@gmail.com", homeAddress: "42156 Biggs Rd. Lagrange", projectedRevenue: "$0.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 57, firstName: "Rick", lastName: "Warner", agent: "ANeus", source: "unsure", contactDate: "11-19-2025", currentStep: "Paid & Done", contractPresentationDate: "11/19/2025", nextStepDueDate: "", jobType: "Roof repair", phoneNumber: "4404206335", email: "rwarner31@aol.com", homeAddress: "320 Hayes Ave. Elyria", projectedRevenue: "$550.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 58, firstName: "Denise", lastName: "Nail", agent: "MDavi", source: "West Roofing", contactDate: "01-12-2026", currentStep: "Paid & Done", contractPresentationDate: "1/13/2026", nextStepDueDate: "", jobType: "Chimney repair", phoneNumber: "4407598270", email: "denisen@rowlandonline.net", homeAddress: "6245 W River Rd. Elyria", projectedRevenue: "$500.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 59, firstName: "Brian", lastName: "Depolo", agent: "MDavi", source: "Google", contactDate: "01-13-2026", currentStep: "Pending Signature", contractPresentationDate: "", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4403200916", email: "brian.depo@gmail.com", homeAddress: "28008 Osborn Rd. Bay Village", projectedRevenue: "", companyCam: false, pendingNotes: "" },
        { sortOrder: 60, firstName: "Josephine", lastName: "Maldonado", agent: "MDavi", source: "Refferal (Noah Haynes)", contactDate: "01-05-2026", currentStep: "Presentation Scheduled", contractPresentationDate: "", nextStepDueDate: "", jobType: "Roof/Gutters/Siding", phoneNumber: "4406703818", email: "", homeAddress: "3251 Lowell Ave. Lorain", projectedRevenue: "", companyCam: false, pendingNotes: "" },
        { sortOrder: 61, firstName: "Nick", lastName: "Cseke", agent: "MDavi", source: "Linkedin", contactDate: "01-13-2026", currentStep: "Presentation Scheduled", contractPresentationDate: "", nextStepDueDate: "01-15-2026", jobType: "Roof/Gutters/Deck", phoneNumber: "440-724-8936", email: "tocitync7@yahoo.com", homeAddress: "10240 Mayfield Rd. Chesterland", projectedRevenue: "$0.00", companyCam: false, pendingNotes: "" },
        { sortOrder: 62, firstName: "Ryan", lastName: "Benson", agent: "GPhem", source: "Website", contactDate: "01-14-2026", currentStep: "Initial Contact", contractPresentationDate: "", nextStepDueDate: "", jobType: "Roof", phoneNumber: "3307327839", email: "valmalta@neo.rr.com", homeAddress: "433 Swank Dr. Tallmadge", projectedRevenue: "", companyCam: false, pendingNotes: "" },
        { sortOrder: 63, firstName: "Anthony", lastName: "Fox", agent: "ANeus", source: "Website", contactDate: "01-14-2026", currentStep: "Initial Contact", contractPresentationDate: "", nextStepDueDate: "", jobType: "Roof", phoneNumber: "4405065047", email: "Tony.foxhvac@gmail.com", homeAddress: "346 Princeton Ave. Elyria", projectedRevenue: "", companyCam: false, pendingNotes: "" },
        { sortOrder: 64, firstName: "Edie", lastName: "Miller", agent: "DMont", source: "Daniel contact", contactDate: "09-19-2025", currentStep: "Contract Signed", contractPresentationDate: "9/19/2025", nextStepDueDate: "", jobType: "Retail siding", phoneNumber: "216-407-2167", email: "edieandkay@aol.com", homeAddress: "2530 W 14th St. Cleveland", projectedRevenue: "$27,450.00", companyCam: false, pendingNotes: "Imported by DZ" },
        { sortOrder: 65, firstName: "Lois", lastName: "Stimmel", agent: "DMont", source: "Daniel contact", contactDate: "10-13-2025", currentStep: "Contract Signed", contractPresentationDate: "10/13/2025", nextStepDueDate: "01-19-2026", jobType: "Roof", phoneNumber: "4406873805", email: "ljstimmel@yahoo.com", homeAddress: "6392 Denise Dr. North Ridgeville", projectedRevenue: "$15,662.70", companyCam: false, pendingNotes: "imported by DZ" },
        { sortOrder: 66, firstName: "Sarah", lastName: "Smith", agent: "DZimm", source: "Door knocking in avon", contactDate: "01-19-2026", currentStep: "Archived", contractPresentationDate: "1/27/2026", nextStepDueDate: "01-22-2026", jobType: "siding and roof job", phoneNumber: "4405555789", email: "testing@video.com", homeAddress: "3456 west water road", projectedRevenue: "$100,000.00", companyCam: false, pendingNotes: "she wants to schedule the build in april." },
        { sortOrder: 67, agent: "ANeus", name: "Lois Martinez", source: "Referral", contactDate: "08-15-2025", currentStep: "Paid & Done", contractPres: "10/28/2025", nextStepDue: "", jobType: "Roof", phone: "2406745736", email: "leamartinez2556@yahoo.com", address: "5690 Cherrywood Dr. Lorain", revenue: "$24,067.39", companyCam: false, pendingNotes: "", firstName: "Lois", lastName: "Martinez"}
    ];


    const targetClient = clients.find(c => c.displayId === '4WK21Y');

    if (!targetClient || !targetClient.path) {
        toast({ title: "Client 4WK21Y Not Found", description: "Could not find the specified client to restore leads to. Please ensure it has been created.", variant: "destructive" });
        setIsRestoring(false);
        return;
    }

    try {
        const clientPath = targetClient.path;
        const leadsCollectionRef = collection(firestore, clientPath, 'leads');
        const syncedLeadsCollectionRef = collection(firestore, 'syncedLeads');

        const deleteBatch = writeBatch(firestore);

        const [existingClientLeadsSnapshot, existingSyncedLeadsSnapshot] = await Promise.all([
            getDocs(leadsCollectionRef),
            getDocs(syncedLeadsCollectionRef)
        ]);
        
        existingClientLeadsSnapshot.forEach(leadDoc => {
            deleteBatch.delete(leadDoc.ref);
        });

        existingSyncedLeadsSnapshot.forEach(syncedDoc => {
            deleteBatch.delete(syncedDoc.ref);
        });

        await deleteBatch.commit();
        
        const addBatch = writeBatch(firestore);
        for (const lead of leadsData) {
            const newLeadId = `lead-${String(lead.sortOrder).padStart(3, '0')}`;
            const newLeadRef = doc(leadsCollectionRef, newLeadId);
            
            const leadDocData = { ...lead, createdAt: serverTimestamp() };
            addBatch.set(newLeadRef, leadDocData);

            const syncedLeadData: SyncedLead = {
                agent: lead.agent,
                name: `${lead.firstName} ${lead.lastName}`,
                source: lead.source || '',
                contactDate: lead.contactDate || '',
                currentStep: lead.currentStep || '',
                contractPres: lead.contractPresentationDate || '',
                nextStepDue: lead.nextStepDueDate || '',
                jobType: lead.jobType || '',
                phone: lead.phoneNumber || '',
                email: lead.email || '',
                address: lead.homeAddress || '',
                revenue: lead.projectedRevenue || '',
                companyCam: lead.companyCam || false,
                pendingNotes: lead.pendingNotes || '',
                sortOrder: lead.sortOrder
            };
            const syncedLeadRef = doc(firestore, 'syncedLeads', newLeadId);
            addBatch.set(syncedLeadRef, syncedLeadData);
        }

        await addBatch.commit();

        toast({
            title: "Leads Restored!",
            description: `The lead data has been reset to the correct ${leadsData.length} records.`,
        });
    } catch (e: any) {
        console.error("Error restoring leads:", e);
        toast({
            title: "Restore Failed",
            description: e.message || "An unknown error occurred during data restoration.",
            variant: "destructive",
        });
    } finally {
        setIsRestoring(false);
    }
};

  const isLoading = areUsersLoading || areClientsLoading;

  if (!isUnlocked) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield /> Admin Panel Access</CardTitle>
                <CardDescription>Enter the passcode to manage users and clients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <Label htmlFor="admin-passcode">Admin Passcode</Label>
                <Input
                    id="admin-passcode"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter>
                <Button onClick={handleUnlock}><Unlock className="mr-2"/> Unlock</Button>
            </CardFooter>
        </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Assign roles and client access to users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned Client</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.firstName} {u.lastName}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Select
                        defaultValue={u.role || 'user'}
                        onValueChange={value =>
                          handleRoleChange(u.id, value as 'admin' | 'manager' | 'user')
                        }
                        disabled={u.email === 'service@huxleigh.com'}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={u.assignedClientId || 'none'}
                        onValueChange={value =>
                          handleAssignmentChange(u.id, value)
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="None"/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {clients?.map(c => (
                            <SelectItem key={c.id} value={c.displayId}>
                              {c.firmName} ({c.displayId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><DatabaseZap /> Data Restoration</CardTitle>
            <CardDescription>One-time operation to restore data for a specific client.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm">This tool will first **delete all existing leads** for client <strong>4WK21Y</strong> from both the client-specific `leads` collection and the global `syncedLeads` collection, and then restore the 68 official lead records. This ensures a clean data set.</p>
        </CardContent>
        <CardFooter>
            <Button onClick={handleRestore} disabled={isRestoring}>
                {isRestoring ? <Loader2 className="mr-2 animate-spin"/> : <DatabaseZap className="mr-2" />}
                {isRestoring ? 'Restoring...' : 'Restore 4WK21Y Leads'}
            </Button>
        </CardFooter>
      </Card>
    </>
  );
}

    