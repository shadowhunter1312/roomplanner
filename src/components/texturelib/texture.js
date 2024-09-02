import React, { useState,useEffect,useCallback } from 'react';

import '../styles/sidebar.css';
import apiurl from '../api.json'


const Sidebar = ({  onTextureSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState([]);
 
  const [selectedCatalogue, setSelectedCatalogue] = useState('');
  const [selectedFinish, setSelectedFinish] = useState('');
  const [sortByType, setSortByType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [texturesPerPage] = useState(20);

  const [seriesOptions, setSeriesOptions] = useState([]);
  const [finishOptions, setfinishOptions] = useState([]);
  const [totaltextures ,setFiliterdTextures] = useState([]);

  const [currentTextures, setCurrentTextures] = useState([]);
  const [filterType, setFilterType] = useState('CNE'); // Initial filter type

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${apiurl.directapi}?type=${filterType}`);
        const jsonData = await response.json();
        setData(jsonData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [filterType]);

  const checkCatalogueFilter =useCallback( (texture) => {
    if (selectedCatalogue && selectedCatalogue !== '') {
      return texture.Catalogue === selectedCatalogue;
    }
    return true;
  },[selectedCatalogue]);

  const checkFinishFilter = useCallback((texture) => {
    if (selectedFinish && selectedFinish !== '') {
      return texture.Finish === selectedFinish;
    }
    return true;
  },[selectedFinish]);

  const filterTextures = useCallback(() => {
    return data.filter((texture) => {
      return (
        (checkCatalogueFilter(texture) &&
        checkFinishFilter(texture) &&
        texture.Design_Name.toLowerCase().includes(searchTerm.toLowerCase())) // Check if Design_Name includes the searchTerm
      );
    });
  }, [data, checkCatalogueFilter, checkFinishFilter,searchTerm]);

  const sortTextures = useCallback((textures) => {
    if (sortByType === 'az') {
      return textures.slice().sort((a, b) => a.Design_Name.localeCompare(b.Design_Name));
    } else if (sortByType === 'za') {
      return textures.slice().sort((a, b) => b.Design_Name.localeCompare(a.Design_Name));
    }
    return textures;
  }, [sortByType]);

  const updateFurnitureContainer = useCallback(() => {
    const filteredTextures = filterTextures(data);
    const sortedTextures = sortTextures(filteredTextures);
  setFiliterdTextures(sortedTextures);
    const indexOfLastTexture = currentPage * texturesPerPage;
    const indexOfFirstTexture = indexOfLastTexture - texturesPerPage;
    const updatedCurrentTextures = sortedTextures.slice(indexOfFirstTexture, indexOfLastTexture);
    setCurrentTextures(updatedCurrentTextures);
    // Render the filtered and sorted textures and pagination buttons
  }, [data, currentPage, texturesPerPage, filterTextures, sortTextures]);

  useEffect(() => {
    // Filter unique Catalogue values based on the data
    const uniqueCatalogues = [...new Set(data.map(texture => texture.Catalogue))];
    setSeriesOptions(uniqueCatalogues);
    setSelectedCatalogue(uniqueCatalogues[0]);
  
   
  }, [data]);

  useEffect(() => {
    // Filter unique Finish values based on the selected catalogue
    if (selectedCatalogue) {
      const filteredTexturesForFinish = data.filter(texture => texture.Catalogue === selectedCatalogue);
      const uniqueFinish = [...new Set(filteredTexturesForFinish.map(texture => texture.Finish))];
      setfinishOptions(uniqueFinish);
    }
  }, [selectedCatalogue, data]);

  const handleTextureSelect = (texture) => {
    onTextureSelect({ value: 'Terrazzo_Tiles_002', index: 4 });
  };

  const handleClose = () => {
    onClose();
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event);
    updateFurnitureContainer();
  };
  
  const handleAreaChange = (event) => {
    const selectedArea = event;
    setFilterType(selectedArea);
    setSelectedFinish('');
    updateFurnitureContainer();
  };

  const handleCatalogueChange = (event) => {
  
    setSelectedCatalogue(event);
    setSelectedFinish('');
    
    updateFurnitureContainer();

    const filteredTexturesForFinish = data.filter(texture => texture.Catalogue === event);
    const uniqueFinish = [...new Set(filteredTexturesForFinish.map(texture => texture.Finish))];
    setfinishOptions(uniqueFinish);

  };


  const handleFinishChange = (event) => {
    setSelectedFinish(event);
  };

  const handleSortByChange = (event) => {
    setSortByType(event);
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  useEffect(() => {
    updateFurnitureContainer();
  }, [updateFurnitureContainer,currentPage]);

  return (
    <div className="sidebar-modal">
    <div className='modal-content'>
    <div className="headermodel" >
					<div className="namehead" id="wallpaint">Tiles</div>
        <button className="close-button" onClick={handleClose}>
          X
        </button>
        </div>
    <div className="modal-header">
   
        <div className="filter-row">
        <div className="filter-block">
            <label htmlFor="area">Area</label>
            <select name="area" onChange={(e) => handleAreaChange(e.target.value)} className="selectField">
              <option value="CNE">North and East India</option>
              <option value="CSW">South and West India</option>
            </select>
          </div>
          <div className="filter-block">
            <label htmlFor="catalogue">Size and Series</label>
            <select
              name="catalogue"
              onChange={(e) => handleCatalogueChange(e.target.value)}
              className="selectField"
              id="series1"
            >
       {seriesOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            </select>
          </div>
          <div className="filter-block" id="choosefinish">
            <label htmlFor="finish">Finish</label>
            <select
              name="finish"
              onChange={(e) => handleFinishChange(e.target.value)}
              className="selectField"
              id="finish1"
            >
              <option value="">All</option>
              {finishOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            </select>
          </div>
          <div className="filter-block">
            <label htmlFor="sort_by">Sort By</label>
            <select
              name="sort_by"
              onChange={(e) => handleSortByChange(e.target.value)}
              className="selectField"
            >
              <option value="az">Name A -> Z</option>
              <option value="za">Name Z -> A</option>
            </select>
          </div>
          </div>
        
        <div className="search-bar">
          <i className="fa fa-search"></i>
          <input
            type="text"
            placeholder="Search"
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        
        </div>
      </div>
    <div className="model-details">

      
      <div className="texture-list">
      <div className='pattern-main-block'>
      {currentTextures && currentTextures.map((texture) => (

          
          <div
              key={texture.id}
              className="pattern-block-inner"
              
            >
              <div className="imgblock">
                <div style={{ display: texture.Randvis }}>
                  <img className="randamimg" src="assets/images/random.png" alt="Random" />
                </div>
                <img className="textureimg" src={texture.Design_Diffuse} alt={texture.Design_Name} />
                <span data-id={texture.id} className="openTile modal-close" onClick={() => handleTextureSelect(texture)}>
                  Apply Design
                </span>
              </div>
              <div className="bottom-ul-block">
                <ul className="left-ul">
                  <li>
                    <b style={{ fontSize: '15px' }}>{texture.Design_Name}</b>
                  </li>
                  <li>
                    <b>{texture.Product_id}</b>
                  </li>
                  <li>{texture.Finish}</li>
                  <li>{texture.XScale} X {texture.YScale} mm</li>
                </ul>
                <ul className="right-ul">
                  <li>
                    <a target="_blank" rel="noreferrer" href={`https://www.kajariaceramics.com/product/${texture.directsrc}`}>
                      Details
                    </a>
                  </li>
                </ul>
              </div>
            </div>
        ))}
        </div>
        <div className="pagination-buttons">
            <div className="flex-parent jc-center">
              <button
                className="btn btn-primary margin-right"
                onClick={() => paginate(1)}
                disabled={currentPage === 1}
              >
                First
              </button>
              <button
                className="btn btn-primary margin-right"
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <button
                className="btn btn-primary margin-right"
                onClick={() => paginate(currentPage + 1)}
                disabled={totaltextures.length <= texturesPerPage || totaltextures.length < texturesPerPage}
              >
                Next
              </button>
              <button
                className="btn btn-primary margin-right"
                onClick={() => paginate(Math.ceil(totaltextures.length / texturesPerPage))}
                disabled={currentPage === Math.ceil(totaltextures.length / texturesPerPage) || totaltextures.length <= texturesPerPage || totaltextures.length < texturesPerPage}
              >
                Last
              </button>
            </div>
          </div>
      </div>
    </div>
    </div>
    </div>
  );
};

export default Sidebar;