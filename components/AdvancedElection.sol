// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AdvancedElection
 * @dev Implements a Commit-Reveal voting algorithm to ensure privacy during the voting phase
 *      and prevent vote manipulation or late-voter bias.
 */
contract AdvancedElection {
    
    address public electionAdmin;
    string public title;
    
    enum ElectionState { Draft, RegistrationOn, CommitPhase, RevealPhase, Closed, Finalized }
    ElectionState public state;
    
    struct Candidate {
        uint id;
        string name;
        string party;
        uint voteCount;
        bool exists;
    }
    
    struct Voter {
        bool isRegistered;
        bool hasCommitted;
        bool hasRevealed;
        bytes32 commitment;
    }
    
    uint public candidateCount;
    mapping(uint => Candidate) public candidates;
    mapping(address => Voter) public voters;
    
    // Store registered voter addresses for auditing and tracking
    address[] public registeredVoters;
    
    // Total votes revealed properly
    uint public totalVotesMined;

    // Events
    event ElectionCreated(string title, address admin);
    event VoterRegistered(address voter);
    event CandidateAdded(uint candidateId, string name, string party);
    event StateChanged(ElectionState newState);
    event VoteCommitted(address voter);
    event VoteRevealed(address voter, uint candidateId);
    event ElectionFinalized(uint totalVotes);

    modifier onlyAdmin() {
        require(msg.sender == electionAdmin, "Only admin can call this function");
        _;
    }

    modifier inState(ElectionState _state) {
        require(state == _state, "Invalid election state for this operation");
        _;
    }

    constructor(string memory _title) {
        electionAdmin = msg.sender;
        title = _title;
        state = ElectionState.Draft;
        emit ElectionCreated(_title, msg.sender);
    }
    
    // --- Phase 1: Setup ---
    function addCandidate(string memory _name, string memory _party) public onlyAdmin inState(ElectionState.Draft) {
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, _name, _party, 0, true);
        emit CandidateAdded(candidateCount, _name, _party);
    }
    
    function startRegistration() public onlyAdmin inState(ElectionState.Draft) {
        require(candidateCount > 0, "Must have at least one candidate");
        state = ElectionState.RegistrationOn;
        emit StateChanged(state);
    }

    // --- Phase 2: Registration ---
    function registerVoter(address _voter) public onlyAdmin inState(ElectionState.RegistrationOn) {
        require(!voters[_voter].isRegistered, "Voter already registered");
        voters[_voter].isRegistered = true;
        registeredVoters.push(_voter);
        emit VoterRegistered(_voter);
    }

    function startCommitPhase() public onlyAdmin inState(ElectionState.RegistrationOn) {
        require(registeredVoters.length > 0, "No voters registered");
        state = ElectionState.CommitPhase;
        emit StateChanged(state);
    }

    // --- Phase 3: Voting / Commit Phase ---
    /**
     * @dev Voters submit a hash of (candidateId + salt). 
     * Keeps votes completely private during the voting window.
     */
    function commitVote(bytes32 _commitment) public inState(ElectionState.CommitPhase) {
        require(voters[msg.sender].isRegistered, "You are not a registered voter");
        require(!voters[msg.sender].hasCommitted, "You have already cast a commitment");
        
        voters[msg.sender].commitment = _commitment;
        voters[msg.sender].hasCommitted = true;
        
        emit VoteCommitted(msg.sender);
    }

    function startRevealPhase() public onlyAdmin inState(ElectionState.CommitPhase) {
        state = ElectionState.RevealPhase;
        emit StateChanged(state);
    }

    // --- Phase 4: Reveal Phase ---
    /**
     * @dev Voters reveal their candidateId and salt to prove their commitment.
     */
    function revealVote(uint _candidateId, string memory _salt) public inState(ElectionState.RevealPhase) {
        require(voters[msg.sender].hasCommitted, "No vote committed");
        require(!voters[msg.sender].hasRevealed, "Vote already revealed");
        require(candidates[_candidateId].exists, "Invalid candidate");

        // Verify commitment (using keccak256 hash of id as string and salt so it can easily be recreated off-chain)
        bytes32 verifyHash = keccak256(abi.encodePacked(_candidateId, _salt));
        require(verifyHash == voters[msg.sender].commitment, "Commitment does not match revealed data");

        voters[msg.sender].hasRevealed = true;
        candidates[_candidateId].voteCount += 1;
        totalVotesMined += 1;

        emit VoteRevealed(msg.sender, _candidateId);
    }

    function closeElection() public onlyAdmin inState(ElectionState.RevealPhase) {
        state = ElectionState.Closed;
        emit StateChanged(state);
    }

    // --- Phase 5: Finalization ---
    function finalizeTally() public onlyAdmin inState(ElectionState.Closed) {
        state = ElectionState.Finalized;
        emit StateChanged(state);
        emit ElectionFinalized(totalVotesMined);
    }

    // --- Getters ---
    function getCandidate(uint _id) public view returns (uint id, string memory name, string memory party, uint voteCount) {
        require(candidates[_id].exists, "Candidate does not exist");
        Candidate memory c = candidates[_id];
        // Only allow viewing specific vote count if election is closed/finalized
        // Or leave open depending on rules (in commit-reveal, the reveal phase itself shows votes rolling in).
        return (c.id, c.name, c.party, c.voteCount);
    }
    
    function getAllCandidates() public view returns (Candidate[] memory) {
        Candidate[] memory array = new Candidate[](candidateCount);
        for(uint i = 1; i <= candidateCount; i++) {
            array[i-1] = candidates[i];
        }
        return array;
    }
    
    function generateCommitmentHash(uint _candidateId, string memory _salt) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_candidateId, _salt));
    }
}
