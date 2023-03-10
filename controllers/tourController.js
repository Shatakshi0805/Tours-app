// const fs = require("fs");
// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`));//JSON.parse() creates JS Object

// exports.checkId = (req, res, next, val) => {//extra 4th arg for id param
//   console.log(`Tour id is ${val}`);

//   if (val * 1 > tours.length) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'Invalid ID'
//     });
//   }
//   next();
// }

// exports.checkBody = (req, res, next) => {
//   const {name, price} = req.body;
//   if (!name || !price) {
//     return res.status(400).json({
//       status: "fail",
//       message: "Missing name or price"
//     })
//   }
//   next();
// }

const Tour = require("./../models/tourModel");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

exports.aliasTours = (req, res, next) => {
  req.query.limit = "8";
  req.query.sort = "-ratingsAverage,price";
  req.query.fields = "name,price,ratingsAverage,difficulty,summary";
  next();
}

//GET ALL TOURS
exports.getAllTours = catchAsync(async (req, res) => {
    const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
    //THE LAST => EXECUTE QUERY
    // const query = Tour.find({});
    const tours = await features.query;

    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        tours
      }
    });
})



//CREATE NEW TOUR
exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour
    }
  });
})

//GET SPECIFIC TOUR
exports.getTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findById(req.params.id);
    //OR Tour.findOne({ _id: req.params.id })

    if (!tour) {//if id is somewhat valid but some number or value is changed a bit like "63c927dd76f26535ec507a76" is valid but if last 6 is chnaged to 0 it will show tour: null so to avoid that error we show below error
      return next(new AppError("No tour find with that ID", 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        tour
      }
    });
})

//UPDATE TOUR
exports.updateTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true//runs validator every time on update
    });

    if (!tour) {//if id is somewhat valid but some number or value is changed a bit like "63c927dd76f26535ec507a76" is valid but if last 6 is chnaged to 0 it will show tour: null so to avoid that error we show below error
      return next(new AppError("No tour find with that ID", 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        tour
      }
    });
})

exports.deleteTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findByIdAndDelete(req.params.id);

    if (!tour) {//if id is somewhat valid but some number or value is changed a bit like "63c927dd76f26535ec507a76" is valid but if last 6 is chnaged to 0 it will show tour: null so to avoid that error we show below error
      return next(new AppError("No tour find with that ID", 404));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
    
})

exports.getTourStats = catchAsync(async (req, res, next) => {//consists array of stages where every stage is an object
    const stats = await Tour.aggregate([
      {
        $match: {ratingsAverage: {$gte: 4.5}}//select as per field specified
      },
      {
        $group: {
          // _id: "$ratingsAverage",
          _id: {$toUpper: "$difficulty"},//groups tours with easy, medium & difficult fields and provides corresponding values like avgPrice,minPrice.maxPrice etc
          numTour: {$sum : 1},//calc total tours, 1 val for each mongodb document that will go through this pipeline
          numRatings: {$sum: "$ratingsQuantity"},
          avgRating: {$avg: "$ratingsAverage"},
          avgPrice: {$avg: "$price"},
          minPrice: {$min: "$price"},
          maxPrice: {$max: "$price"}
        }
      },
      {
        $sort: {avgPrice: 1}
      },
      // {
      //   $match: {_id: {$ne: "EASY"}}
      // }
      
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  
})

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1;//2021

    const plan = await Tour.aggregate([
      {
        $unwind: "$startDates"
      },
      {
        $match: {
          startDates: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: {$month: "$startDates"},
          numTourStarts: {$sum: 1},
          tours: {$push: "$name"}
        }
      },
      {
        $addFields: {month: "$_id"}
      },
      {
        $project: {
          _id: 0
        }
      },
      {
        $sort: {numTourStarts: -1}
      },
      {
        $limit: 12
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        plan
      }
    });
});
